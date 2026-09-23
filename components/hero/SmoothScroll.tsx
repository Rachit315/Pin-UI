"use client";

import { useEffect } from "react";

/**
 * Turns on smooth scrolling, but only once the page has been painted.
 *
 * `scroll-behavior: smooth` on `html` applies to the browser's own jump to a
 * fragment on first load, so arriving at `/#components` glides down from
 * the hero instead of landing where the link pointed — and on a slow load that
 * glide starts late and looks like a fault. Enabling it from an effect means
 * the first navigation lands instantly and every anchor clicked afterwards
 * still travels.
 *
 * It renders nothing; the stylesheet keys off the attribute it sets.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.pinScroll = "smooth";
    return () => {
      delete root.dataset.pinScroll;
    };
  }, []);

  return null;
}
