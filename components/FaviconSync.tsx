"use client";

import { useEffect } from "react";
import { usePinTheme } from "@/lib/theme";
import { FAVICONS } from "@/lib/theme-constants";

/**
 * Keeps the tab icon in step with the theme.
 *
 * A favicon cannot follow CSS custom properties, and an SVG's own
 * `prefers-color-scheme` query would follow the *operating system* rather than
 * the theme someone picked here — so the `href` is swapped directly instead.
 *
 * The inline script in the layout does the same thing before first paint, so
 * this only ever runs on a real toggle; the two share `FAVICONS` so they can
 * never disagree.
 */
export default function FaviconSync() {
  const { theme } = usePinTheme();

  useEffect(() => {
    const icons = FAVICONS[theme];

    const svg = document.getElementById("pin-icon-svg");
    if (svg instanceof HTMLLinkElement) svg.href = icons.svg;

    const png = document.getElementById("pin-icon-png");
    if (png instanceof HTMLLinkElement) png.href = icons.png;

    /* the browser UI colour belongs to the theme too */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta instanceof HTMLMetaElement) meta.content = icons.themeColor;
  }, [theme]);

  return null;
}
