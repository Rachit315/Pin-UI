/**
 * Where a signup actually goes.
 *
 * Supabase, over plain fetch — PostgREST is just HTTP, so there is no client
 * library to ship and nothing extra in the bundle. This module is server-only;
 * the key it reads has no NEXT_PUBLIC_ prefix and so never reaches the browser.
 *
 * The table has row level security on with no policies at all, which means this
 * key cannot read, insert or delete rows directly. The single way in is the
 * security-definer function `join_waitlist`, so even if the key leaked, the
 * worst anyone could do is add a row — and that is rate limited by address.
 *
 * With no Supabase configured the signup is logged and the request still
 * succeeds, so local work and previews never fail in a visitor's face.
 */

import "server-only";

export type JoinStatus = "ok" | "duplicate" | "invalid" | "rate_limited";

export type JoinResult = {
  status: JoinStatus;
  /** 1-based place on the list, or null when there is no place to report. */
  position: number | null;
};

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export const hasStore = Boolean(URL_BASE && KEY);

export async function joinWaitlist(
  email: string,
  handle: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<JoinResult> {
  if (!hasStore) {
    console.info("[waitlist] no store configured — signup", email, handle);
    return { status: "ok", position: null };
  }

  const response = await fetch(`${URL_BASE}/rest/v1/rpc/join_waitlist`, {
    method: "POST",
    headers: {
      apikey: KEY as string,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_email: email,
      p_handle: handle,
      p_ip: meta.ip ?? null,
      p_user_agent: meta.userAgent ?? null,
    }),
    /* a waitlist write must never be served from a cache */
    cache: "no-store",
  });

  if (!response.ok) {
    /* surfaced to the route, which decides what the visitor is told */
    throw new Error(
      `supabase ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    status?: JoinStatus;
    position?: number;
  };

  return {
    status: data.status ?? "ok",
    position: typeof data.position === "number" ? data.position : null,
  };
}
