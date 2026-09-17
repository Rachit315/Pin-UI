import { TICKET_BOX, TICKET_PATH } from "@/lib/art";

/**
 * The ticket outline from Figma 245:140 — notched top and bottom centre with a
 * perforation between the stub and the body. Drawn in the original coordinate
 * space and cropped by the viewBox, so the path is untouched from the file.
 *
 * The fill is a gradient whose stops are theme tokens, so it flips with the page.
 */
export default function TicketShape({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`${TICKET_BOX.x} ${TICKET_BOX.y} ${TICKET_BOX.w} ${TICKET_BOX.h}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="pinTicketFill"
          x1="722.48"
          y1="250.25"
          x2="-81.5841"
          y2="483.081"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--pin-ticket-from)" />
          <stop offset="1" stopColor="var(--pin-ticket-to)" />
        </linearGradient>
      </defs>
      <path d={TICKET_PATH} fill="url(#pinTicketFill)" />
    </svg>
  );
}
