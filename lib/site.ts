/**
 * The canonical address. Overridable for previews and custom domains, but it
 * must never fall back to a localhost URL, empty string, or malformed URL.
 *
 * NEXT_PUBLIC_SITE_URL is set in wrangler.jsonc for the Cloudflare worker and
 * in .env.local for development; anything missing or malformed falls back to
 * "https://pinui.xyz".
 */
function resolveSiteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        const withProtocol =
          trimmed.startsWith("http://") || trimmed.startsWith("https://")
            ? trimmed
            : `https://${trimmed}`;
        try {
          const parsed = new URL(withProtocol);
          return parsed.origin.replace(/\/$/, "");
        } catch {
          // Continue to next candidate if parsing fails
        }
      }
    }
  }

  return "https://pinui.xyz";
}

export const SITE_URL = resolveSiteUrl();
