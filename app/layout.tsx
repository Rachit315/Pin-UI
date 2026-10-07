import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Caveat, Manrope } from "next/font/google";
import { LINKS } from "@/lib/links";
import { SITE_URL } from "@/lib/site";
import FaviconSync from "@/components/FaviconSync";
import NoFlashScript from "@/components/NoFlashScript";
import {
  DEFAULT_THEME,
  FAVICONS,
  THEME_STORAGE_KEY,
} from "@/lib/theme-constants";
import {
  organizationJsonLd,
  webSiteJsonLd,
  safeJsonLd,
} from "@/lib/jsonld";
import "./globals.css";

/*
 * Manrope is the Thermal Dial's face. It is self-hosted by Next at build time
 * and exposed as a variable rather than applied, and not preloaded: only the
 * pages that draw the dial ever download it.
 */
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});

/*
 * Caveat is the hand the "switch theme" note beside the logo is written in.
 * The note is at the top of almost every page, so this one is preloaded — a
 * fallback face swapping into script a second late is exactly the jolt a
 * handwritten aside should not make.
 */
const scribble = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-scribble",
  display: "swap",
});

/* What a link preview says. The tab says less — see `title` below. */
const TITLE = "Pin UI — Components worth building with";
const DESCRIPTION =
  "Free, open-source React components built from Pinterest designs: animated, in light and dark, ready to copy into your project. Designed and built by Rachit Thakur.";

/**
 * `app/opengraph-image.jpg` and `app/twitter-image.jpg` are picked up by Next
 * automatically: it emits the tags with absolute URLs, real dimensions and the
 * right mime type, which is what every scraper wants and what hand-written tags
 * usually get wrong.
 */
function getMetadataBase(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("https://pinui.xyz");
  }
}

export const metadata: Metadata = {
  /* absolute URLs for social cards resolve against the canonical site */
  metadataBase: getMetadataBase(),
  title: "Pin UI",
  description: DESCRIPTION,
  applicationName: "Pin UI",
  authors: [{ name: "Rachit Thakur", url: LINKS.x }],
  creator: "Rachit Thakur",
  publisher: "Pin UI",
  keywords: [
    "Pin UI",
    "UI components",
    "React components",
    "Next.js components",
    "animated components",
    "Motion",
    "open source",
    "Pinterest designs",
    "dark mode",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Pin UI",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@RachitThakur146",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: FAVICONS.light.themeColor,
  width: "device-width",
  initialScale: 1,
  /* the stage is exactly one viewport tall; let it sit under the notch */
  viewportFit: "cover",
};

/*
 * Runs before first paint so a remembered theme never flashes the other one —
 * and that includes the tab icon, which would otherwise show the light mark for
 * a moment on a crimson reload.
 */
const noFlash = `
(function () {
  var icons = ${JSON.stringify(FAVICONS)};
  var theme = ${JSON.stringify(DEFAULT_THEME)};
  /* a choice the visitor has made, either way, always wins over the default */
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (stored === "crimson" || stored === "light") theme = stored;
  } catch (e) {}

  document.documentElement.dataset.pinTheme = theme;

  var set = function (id, href) {
    var el = document.getElementById(id);
    if (el) el.href = href;
  };
  set("pin-icon-svg", icons[theme].svg);
  set("pin-icon-png", icons[theme].png);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* the theme attribute is written by the script below, before hydration,
       so React must not claim ownership of it */
    <html lang="en" className={`${manrope.variable} ${scribble.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/*
          Neue Montreal is the design's typeface; Switzer is the closest freely
          hosted match and stands in for anyone without Neue Montreal installed.
        */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f%5B%5D=switzer@400,500,600&display=swap"
        />
        {/*
          Written by hand rather than through Next's `icons` metadata so the
          pre-paint script below has stable ids to swap. React must not reclaim
          the href it writes, hence suppressHydrationWarning.
        */}
        <link
          id="pin-icon-svg"
          rel="icon"
          type="image/svg+xml"
          href={FAVICONS.light.svg}
          suppressHydrationWarning
        />
        <link
          id="pin-icon-png"
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={FAVICONS.light.png}
          suppressHydrationWarning
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        <NoFlashScript id="pin-no-flash" code={noFlash} />

        {/* Site-wide structured data — Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webSiteJsonLd()) }}
        />
      </head>
      <body>
        <FaviconSync />
        {children}
        {/*
          Vercel Web Analytics: page views counted in aggregate, with no cookies
          and no cross-site tracking. It only reports from a Vercel deployment —
          in development it stays in debug mode and sends nothing.
        */}
        <Analytics />
      </body>
    </html>
  );
}
