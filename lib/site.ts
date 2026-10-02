/**
 * The canonical address. Overridable for previews and custom domains, but it
 * must never fall back to a localhost URL, empty string, or malformed URL.
 *
 * In order: NEXT_PUBLIC_SITE_URL (set on Vercel and in .env.local), then the
 * production domain Vercel exposes to every build, and finally
 * "https://pinui.xyz". Preview deployments deliberately do not use their own
 * throwaway URL: canonicals and social cards should always name the real site.
 */
function resolveSiteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];

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
