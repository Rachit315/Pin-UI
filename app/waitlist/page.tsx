import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import WaitlistStage from "@/components/WaitlistStage";
import { breadcrumbJsonLd, safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join Waitlist Pin UI",
  description:
    "Be first in line for Pin UI — cool UI components for GenZ/Vibecoders.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Join Waitlist", url: `${SITE_URL}/waitlist` },
  ]);

  return (
    <main className="stage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      <BrandMark />
      <WaitlistStage />
    </main>
  );
}
