import LaunchingSoon from "@/components/LaunchingSoon";
import StageIn from "@/components/StageIn";

/**
 * The landing page is deliberately bare: no corner mark, no demo strip — one
 * line, one link, centred. The waitlist page is where the product shows itself.
 */
export default function Home() {
  return (
    <main className="stage">
      <StageIn delay={0.06}>
        <LaunchingSoon />
      </StageIn>
    </main>
  );
}
