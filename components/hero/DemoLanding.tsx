"use client";

import dynamic from "next/dynamic";
import HeroSection from "./HeroSection";
import SiteRail from "./SiteRail";
import UniqueSection from "./UniqueSection";
import LazyHydrate from "./LazyHydrate";

/*
 * What sits below the first screen is its own chunk. It is still rendered on
 * the server — the HTML, and everything a crawler reads, is unchanged — but
 * React hydrates each of these in a task of its own once its code arrives,
 * rather than all of them inside the one long task that wakes the page up.
 * On a phone that is the difference between the page answering at once and
 * a few hundred milliseconds of nothing.
 */
const Testimonials = dynamic(() => import("./Testimonials"));
const SiteFooter = dynamic(() => import("./SiteFooter"));
/* these two render nothing until the page is up, so they need no server render at all */
const LenisScroll = dynamic(() => import("./LenisScroll"), { ssr: false });
const SupportCard = dynamic(() => import("./SupportCard"), { ssr: false });

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
      {/* far below the first screen: server-rendered as ever, hydrated as they come near */}
      <LazyHydrate>
        <Testimonials />
      </LazyHydrate>
      <LazyHydrate>
        <SiteFooter />
      </LazyHydrate>
      <SiteRail />
      <LenisScroll />
      {/* once per visit: Pin UI is open source — a star on GitHub helps */}
      <SupportCard />
    </div>
  );
}
