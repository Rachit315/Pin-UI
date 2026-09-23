import type { Metadata } from "next";
import DemoLanding from "@/components/hero/DemoLanding";
import { homepageJsonLd, safeJsonLd } from "@/lib/jsonld";
import "./hero.css";
import "./sections.css";

export const metadata: Metadata = {
  /* the root page's title carries the name alone; the rest of the site suffixes it */
  title: "Pin UI — Components that are unique",
  description:
    "Pin UI is a free, open-source React component library that turns Pinterest-inspired designs into production-ready, copy-paste components. Browse the library.",
  alternates: { canonical: "/" },
};

/** The front of the site. */
export default function HomePage() {
  const schemas = homepageJsonLd();

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <DemoLanding />
    </>
  );
}
