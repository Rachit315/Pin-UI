/**
 * Structured data (JSON-LD) builders for SEO and AEO.
 *
 * Every function returns a plain object that is serialised to a `<script
 * type="application/ld+json">` tag in the server-rendered HTML. The builders
 * are intentionally free of React so they can be called from any server
 * component without pulling in client code.
 *
 * XSS prevention: every consumer must escape `<` when stringifying, either via
 * the `safeJsonLd` helper exported here or by calling `.replace(/<\/g, "\\u003c")`
 * on the raw JSON string.
 */

import { SITE_URL } from "./site";
import { LINKS } from "./links";

/* ── helpers ────────────────────────────────────────────────────────────── */

/** Escape `<` so a JSON-LD string cannot break out of its `<script>` tag. */
export function safeJsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/* ── site-wide schemas (injected in layout.tsx) ─────────────────────────── */

/**
 * Declares "Pin UI" as a known entity — name, logo, social profiles.
 * Runs on every page via the root layout.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Pin UI",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-light.svg`,
    sameAs: [...LINKS.profiles],
    description:
      "Pin UI is a free, open-source React component library that turns Pinterest-inspired designs into production-ready, copy-paste components for modern web apps.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "rachithakur2006@gmail.com",
      contactType: "customer support",
    },
  };
}

/**
 * Declares the site itself — name, URL, publisher.
 * Runs on every page via the root layout.
 */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Pin UI",
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    description:
      "Cool UI components for GenZ and vibecoders. Browse, preview, and copy-paste production-ready React components.",
    inLanguage: "en-US",
  };
}

/* ── homepage schemas ───────────────────────────────────────────────────── */

/** The homepage as a `WebPage` with SoftwareApplication offer. */
export function homepageJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "Pin UI — Cool UI components for GenZ/Vibecoders",
      description:
        "Pin UI is a free, open-source React component library that turns Pinterest-inspired designs into production-ready, copy-paste components for modern web apps.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#software` },
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Pin UI",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0.00",
        priceCurrency: "USD",
      },
      author: { "@id": `${SITE_URL}/#organization` },
      codeRepository: LINKS.github,
      programmingLanguage: ["TypeScript", "React", "CSS"],
      description:
        "A free, open-source React component library that turns Pinterest-inspired designs into production-ready, copy-paste components. Includes Count down, Balance Card, Add To Cart, Chips, Egg OTP, Add Member and more.",
    },
  ];
}

/* ── component page schemas ─────────────────────────────────────────────── */

export type ComponentMeta = {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
};

/** Per-component `SoftwareSourceCode` + `BreadcrumbList`. */
export function componentJsonLd(component: ComponentMeta) {
  const pageUrl = `${SITE_URL}/components/${component.slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: `${component.name} — Pin UI`,
      description: `${component.tagline} ${component.blurb}`.slice(0, 300),
      url: pageUrl,
      codeRepository: LINKS.github,
      programmingLanguage: "TypeScript",
      runtimePlatform: "React",
      author: { "@id": `${SITE_URL}/#organization` },
      isPartOf: { "@id": `${SITE_URL}/#software` },
      license: "https://opensource.org/licenses/MIT",
    },
    breadcrumbJsonLd([
      { name: "Home", url: SITE_URL },
      { name: "Components", url: `${SITE_URL}/#components` },
      { name: component.name, url: pageUrl },
    ]),
  ];
}

/* ── breadcrumb schema ──────────────────────────────────────────────────── */

type BreadcrumbItem = { name: string; url: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ── FAQ page schema ────────────────────────────────────────────────────── */

export type FaqItem = { question: string; answer: string };

export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
