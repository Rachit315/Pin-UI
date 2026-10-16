import type { Metadata } from "next";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import PreviewBack from "@/components/blocks/PreviewBack";
import { BLOCKS, blockBySlug } from "@/lib/blocks";

export function generateStaticParams() {
  return BLOCKS.map((block) => ({ slug: block.slug }));
}

/* the bare block, for the preview frame's iframe: no chrome, and kept out of search */
export const metadata: Metadata = {
  title: "Live preview — Blocx",
  robots: { index: false, follow: false },
};

/*
 * Each block is its own chunk, stylesheet and all, so a preview loads only the
 * block it shows.
 */
const PREVIEWS: Record<string, ComponentType> = {
  "partylabs-hero": dynamic(() => import("@/components/blocks/demo/PartylabsHero")),
  "luna-hero": dynamic(() => import("@/components/blocks/demo/LunaHeroPreview")),
  "orbit-hero": dynamic(() => import("@/components/blocks/demo/OrbitHero")),
  "odometer-pricing": dynamic(() => import("@/components/blocks/demo/OdometerPricing")),
  "caremetric-footer": dynamic(() => import("@/components/blocks/demo/CaremetricFooter")),
  "smart-pricing": dynamic(() => import("@/components/blocks/demo/SmartPricing")),
  "contact-form": dynamic(() => import("@/components/blocks/demo/ContactForm")),
  "synais-footer": dynamic(() => import("@/components/blocks/demo/SynaisFooter")),
  /* parked until their files arrive — see lib/blocks.ts */
  // "quantro-hero": dynamic(() => import("@/components/blocks/demo/QuantroHero")),
  // "forah-hero": dynamic(() => import("@/components/blocks/demo/ForahHero")),
  /* blocks-vault: previews */
};

export default async function BlockPreview({ params }: { params: Promise<{ slug: string }> }) {
  const block = blockBySlug((await params).slug);
  const Preview = block && PREVIEWS[block.slug];
  if (!block || !Preview) notFound();
  return (
    <div style={{ minHeight: "100dvh", background: block.canvas }}>
      <Preview />
      {/* opened on its own, full window: a way back to its page */}
      <PreviewBack slug={block.slug} name={block.name} />
    </div>
  );
}
