"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";

/**
 * Smooth, weighted scrolling for the landing page.
 *
 * The wheel and the trackpad are eased by Lenis; touch keeps the phone's own
 * native scrolling, which is already smooth and which people expect to feel
 * exactly like every other page. Links to `#anchors` glide on the same curve.
 *
 * Nobody who has asked for reduced motion gets it — they get the browser's
 * plain scrolling. It renders nothing.
 */
export default function LenisScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      /* in-page links ease to their section instead of cutting to it */
      anchors: true,
      /* anything that scrolls on its own (a code panel, the phone menu) keeps its own scroll */
      prevent: (node) => node.closest?.("[data-lenis-prevent], .mmenu__sheet") != null,
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
