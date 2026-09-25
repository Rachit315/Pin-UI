import { NextResponse } from "next/server";
import { subscribeUpdates } from "@/lib/updates";

/* a write against Postgres — there is nothing here to prerender */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The visitor's address, as whatever proxy sits in front of us reports it. */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  /* the left-most entry is the original client; the rest are proxies */
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/** The footer's "new regular updates" field: an email, into the `updates` table. */
export async function POST(request: Request) {
  let body: { email?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { message: "That email doesn't look right." },
      { status: 400 },
    );
  }

  try {
    const status = await subscribeUpdates(email, {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    if (status === "rate_limited") {
      return NextResponse.json(
        { message: "Too many signups from here. Try again in a few minutes." },
        { status: 429 },
      );
    }

    if (status === "invalid") {
      return NextResponse.json(
        { message: "That email doesn't look right." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { status },
      /* 201 for a new subscriber, 200 for someone already on the list */
      { status: status === "duplicate" ? 200 : 201 },
    );
  } catch (error) {
    console.error("[updates] could not record the signup", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }
}
