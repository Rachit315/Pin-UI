import { barcodePattern, barcodeUnits } from "@/lib/art";

/**
 * The stub's barcode. Bars come from a hash of the handle, so the same person
 * always gets the same code and the downloaded PNG matches the screen.
 *
 * The viewBox is measured in bar units and stretched to the CSS box, so the
 * block fills the stub at whatever size the ticket happens to be.
 */
export default function Barcode({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const widths = barcodePattern(seed);
  const total = barcodeUnits(widths);

  let x = 0;
  const bars: { x: number; width: number }[] = [];
  widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push({ x, width });
    x += width;
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${total} 100`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={0}
          width={bar.width}
          height={100}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
