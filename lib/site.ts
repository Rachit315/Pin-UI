/**
 * The canonical address. Overridable for previews and custom domains, but it
 * must never fall back to a localhost URL — that address ends up inside shared
 * posts, where it means nothing to anyone.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinui.xyz"
).replace(/\/$/, "");
