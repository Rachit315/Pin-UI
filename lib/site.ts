/**
 * The canonical address. Overridable for previews and custom domains, but it
 * must never fall back to a localhost URL, empty string, or malformed URL.
 *
 * Checks in order:
 * 1. process.env.NEXT_PUBLIC_SITE_URL (custom domain or explicitly set site URL)
 * 2. process.env.NEXT_PUBLIC_VERCEL_URL (Vercel public URL)
 * 3. process.env.VERCEL_PROJECT_PRODUCTION_URL (Vercel production URL)
 * 4. process.env.VERCEL_URL (Vercel deployment URL)
 * 5. Fallback to "https://pinui.xyz"
 */
function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

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
