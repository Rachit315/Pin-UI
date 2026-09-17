import { PIN_BODY_PATHS, PIN_BOX, PIN_STAR_PATH } from "@/lib/art";

/**
 * The Pin UI mark (Figma 240:57), inlined so both fills are theme tokens —
 * the body flips with the page and the star flips with it.
 */
export default function PinMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${PIN_BOX.w} ${PIN_BOX.h}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {PIN_BODY_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="var(--pin-mark)" />
      ))}
      <path d={PIN_STAR_PATH} fill="var(--pin-mark-star)" />
    </svg>
  );
}
