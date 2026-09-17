/**
 * The doubled chevron in the white puck on the Join Waitlist button — two
 * chevrons rotated -90° and offset by 8px, exactly as stacked in the Figma frame.
 */
const CHEVRON =
  "M19.9201 8.9502L13.4001 15.4702C12.6301 16.2402 11.3701 16.2402 10.6001 15.4702L4.08008 8.9502";

export default function Chevrons({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {[2, 10].map((offset) => (
        <path
          key={offset}
          d={CHEVRON}
          transform={`translate(${offset} 0) rotate(-90 12 12)`}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
