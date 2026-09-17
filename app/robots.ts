import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Next serves this at /robots.txt. The API is disallowed because there is
 * nothing there to index and the signup route is a write.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
