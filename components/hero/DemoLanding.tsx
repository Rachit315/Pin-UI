"use client";

import HeroSection from "./HeroSection";
import SiteFooter from "./SiteFooter";
import SiteRail from "./SiteRail";
import SmoothScroll from "./SmoothScroll";
import UniqueSection from "./UniqueSection";

/**
 * The landing page.
 *
 * The wrapper owns the type scale and every colour token, so the hero and the
 * sections under it share one system rather than each carrying its own — the
 * hero is the reference the rest is measured against.
 */
export default function DemoLanding() {
  return (
    <div className="site">
      <HeroSection />
      <UniqueSection />
      <SiteFooter />
      <SiteRail />
      <SmoothScroll />
    </div>
  );
}
