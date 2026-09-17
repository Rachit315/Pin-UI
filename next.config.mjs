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

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        /*
         * The demo clips are the heaviest thing on the site and they do not
         * change between deploys. A week of caching with a month of
         * stale-while-revalidate keeps repeat visits cheap; deliberately not
         * `immutable`, because these filenames are not content-hashed and
         * swapping a clip for a new one under the same name should still take
         * effect for people who have already been here.
         */
        source: "/demo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
