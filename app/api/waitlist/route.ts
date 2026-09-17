import { NextResponse } from "next/server";
import { joinWaitlist } from "@/lib/waitlist";

/* the signup is a write against Postgres — there is nothing here to prerender */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The visitor's address, as whatever proxy sits in front of us reports it. */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  /* the left-most entry is the original client; the rest are proxies */
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  let body: { email?: unknown; handle?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const rawHandle = typeof body.handle === "string" ? body.handle.trim() : "";
  const handle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { message: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (handle.length < 2 || handle.length > 40) {
    return NextResponse.json(
      { message: "Your X/Twitter handle is required." },
      { status: 400 },
    );
  }

  try {
    const { status, position } = await joinWaitlist(email, handle, {
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
        { message: "Check your email and handle." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message:
          status === "duplicate"
            ? "You're already on the list."
            : "You're on the list.",
        position,
      },
      { status: status === "duplicate" ? 200 : 201 },
    );
  } catch (error) {
    console.error("[waitlist] could not record the signup", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }
}
