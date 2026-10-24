"use client";

import HeroSection from "./HeroSection";
import SiteFooter from "./SiteFooter";
import SiteRail from "./SiteRail";
import LenisScroll from "./LenisScroll";
import Testimonials from "./Testimonials";
import UniqueSection from "./UniqueSection";
import SupportCard from "./SupportCard";

/**
 * The landing page.
 *
 * The wrapper owns the type scale and every colour token, so the hero and the
 * sections under it share one system rather than each carrying its own — the
 * hero is the reference the rest is measured against.
 */
export default function DemoLanding() {
  return (
    <div className="site landing cards-v2">
      <HeroSection />
      <UniqueSection />
      <Testimonials />
      <SiteFooter />
      <SiteRail />
      <LenisScroll />
      {/* once per visit: Pin UI is open source — a star on GitHub helps */}
      <SupportCard />
    </div>
  );
}
