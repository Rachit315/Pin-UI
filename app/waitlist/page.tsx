import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import WaitlistStage from "@/components/WaitlistStage";

export const metadata: Metadata = {
  title: "Join Waitlist Pin UI",
  description:
    "Be first in line for Pin UI — cool UI components for GenZ/Vibecoders.",
};

export default function WaitlistPage() {
  return (
    <main className="stage">
      <BrandMark />
      <WaitlistStage />
    </main>
  );
}
