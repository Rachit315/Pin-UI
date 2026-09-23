import type { MetadataRoute } from "next";
import { LIBRARY } from "@/components/library/registry";
import { SITE_URL } from "@/lib/site";

/**
 * Every page the site actually serves.
 *
 * The component pages are listed one by one rather than as a pattern, because
 * they are the pages worth finding — each is a component somebody might be
 * searching for by name.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...LIBRARY.map((entry) => ({
      url: `${SITE_URL}/components/${entry.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/waitlist`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
