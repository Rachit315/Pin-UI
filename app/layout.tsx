import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import FaviconSync from "@/components/FaviconSync";
import {
  DEFAULT_THEME,
  FAVICONS,
  THEME_STORAGE_KEY,
} from "@/lib/theme-constants";
import "./globals.css";

/* What a link preview says. The tab says less — see `title` below. */
const TITLE = "Pin UI — Cool UI components for GenZ/Vibecoders";
const DESCRIPTION =
  "Cool UI components for GenZ and vibecoders. Launching soon — 50 spots on the waitlist.";

/**
 * `app/opengraph-image.png` and `app/twitter-image.png` are picked up by Next
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
  keywords: [
    "Pin UI",
    "UI components",
    "React components",
    "design system",
    "waitlist",
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
  try {
    if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "crimson")
      theme = "crimson";
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
    <html lang="en" suppressHydrationWarning>
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

        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <FaviconSync />
        {children}
      </body>
    </html>
  );
}
