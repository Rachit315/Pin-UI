/**
 * Where a footer "new regular updates" signup goes: the `updates` table,
 * kept apart from the waitlist.
 *
 * The same arrangement as `lib/waitlist.ts` — Supabase over plain fetch, the
 * key server-only, and the table reachable solely through the
 * security-definer function `subscribe_updates`, so the key can add an
 * address but never read or change the list.
 *
 * With no Supabase configured the signup is logged and the request still
 * succeeds, so local work and previews never fail in a visitor's face.
 */

import "server-only";

export type SubscribeStatus = "ok" | "duplicate" | "invalid" | "rate_limited";

const rawUrl = process.env.SUPABASE_URL?.trim();
const rawKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

const URL_BASE = rawUrl && rawUrl.length > 0 ? rawUrl.replace(/\/$/, "") : null;
const KEY = rawKey && rawKey.length > 0 ? rawKey : null;

export async function subscribeUpdates(
  email: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<SubscribeStatus> {
  if (!URL_BASE || !KEY) {
    console.info("[updates] no store configured — signup", email);
    return "ok";
  }

  const response = await fetch(`${URL_BASE}/rest/v1/rpc/subscribe_updates`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_email: email,
      p_ip: meta.ip ?? null,
      p_user_agent: meta.userAgent ?? null,
    }),
    /* a write must never be served from a cache */
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `supabase ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as { status?: SubscribeStatus };
  return data.status ?? "ok";
}
