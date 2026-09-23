import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sent on every response. None of these change how the site renders; they just
 * close off the defaults a browser would otherwise assume.
 */
const securityHeaders = [
  /* do not let a browser second-guess a declared content type */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* send the origin cross-site, never the full path someone was reading */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* nothing here is meant to be embedded in someone else's page */
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  /* Vercel serves this over HTTPS; keep it that way for return visits */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack never walks up into the home directory.
  turbopack: { root: projectRoot },

  /*
   * The component pages print their own source by reading it off disk. They are
   * all prerendered, so that read happens during the build — but the files are
   * traced in anyway, so the pages keep working if one of them ever stops being
   * static.
   */
  outputFileTracingIncludes: {
    "/components/[slug]": ["./components/library/*.tsx", "./components/library/*.css"],
  },

  /*
   * The landing page and the component pages used to live under `/demo`.
   * Anything already pointing there — a shared link, a bookmark, an index —
   * is sent to where they are now rather than to a 404.
   */
  async redirects() {
    return [
      { source: "/demo", destination: "/", permanent: true },
      { source: "/demo/components/:slug", destination: "/components/:slug", permanent: true },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        /*
         * The component clips are the heaviest thing on the site and they do
         * not change between deploys. A week of caching with a month of
         * stale-while-revalidate keeps repeat visits cheap; deliberately not
         * `immutable`, because these filenames are not content-hashed and
         * swapping a clip for a new one under the same name should still take
         * effect for people who have already been here.
         *
         * They live under `/clips`, a path of their own, so that this rule
         * cannot reach any page — no page here may be cached for a week.
         */
        source: "/clips/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        /*
         * Self-hosted fonts are immutable — they never change between deploys.
         * A year of caching keeps repeat visits instant and avoids layout shift
         * from re-downloading Inter and Inter Tight.
         */
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
