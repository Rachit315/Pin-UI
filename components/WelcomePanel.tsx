"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Barcode from "./Barcode";
import PinMark from "./PinMark";
import TicketActions from "./TicketActions";
import TicketShape from "./TicketShape";
import { issueSpring, spring } from "@/lib/motion";
import {
  bodyWidth,
  handleSize,
  layoutEmail,
  TICKET,
  type EmailLayout,
} from "@/lib/ticketLayout";

/**
 * Set the address to the pass.
 *
 * The ticket's rendered width is the only thing measured; everything else comes
 * out of `lib/ticketLayout.ts`, which is the same module the PNG export uses.
 * That is deliberate — the two used to lay the column out separately and drift,
 * so the downloaded file was aligned differently from the pass it was a picture
 * of.
 */
function useEmailLayout(email: string) {
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<EmailLayout | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const ticket = ticketRef.current;
    if (!ticket) return;

    const measure = () => {
      /* offsetWidth, not a bounding rect: the pass sits at a slight angle, and
         a rect would hand back the rotated box, which is a couple of per cent
         wider than the ticket actually is */
      const width = ticket.offsetWidth;
      if (!width) return;

      const font =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--pin-font")
          .trim() || "system-ui, sans-serif";

      /* the spec is quoted at the reference width */
      const ratio = width / TICKET.width;
      setScale(ratio);
      setLayout(layoutEmail(email, bodyWidth(width), font, ratio));
    };

    measure();

    /* the webfont is wider than the fallback it replaces, so anything fitted
       before it arrives has to be measured again */
    void document.fonts?.ready.then(measure).catch(() => {
      /* no font loading API — the first measurement stands */
    });

    const observer = new ResizeObserver(measure);
    observer.observe(ticket);
    return () => observer.disconnect();
  }, [email]);

  return { ticketRef, layout, scale };
}

function withAt(handle: string) {
  const trimmed = handle.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * What the stage becomes once someone is on the list: their ticket, stamped
 * with the details they just entered.
 *
 * The pass is *issued*, in three beats. The blank ticket swings in from below
 * and settles at its resting tilt, carrying enough weight that it reads as an
 * object rather than a panel fading up. The barcode then prints across the
 * stub, left to right, the way a real pass comes out of a machine. Finally the
 * printed lines rise into place, and the copy and buttons follow them.
 *
 * Timings are explicit rather than a variant stagger because the printed rows
 * live inside plain layout divs — a variant label would not reach them, and
 * one visible order beats three levels of nested `staggerChildren`.
 */
const BEAT = {
  ticket: 0,
  print: 0.3,
  brand: 0.42,
  caption: 0.48,
  name: 0.54,
  handle: 0.6,
  title: 0.68,
  note: 0.76,
  actions: 0.86,
} as const;

export default function WelcomePanel({
  email,
  handle,
}: {
  email: string;
  handle: string;
}) {
  const reduced = useReducedMotion();

  /** A printed line rising into place. */
  const line = (delay: number) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 12, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { ...spring, delay },
        } as const);

  const displayHandle = withAt(handle);
  const { ticketRef, layout, scale } = useEmailLayout(email);

  return (
    <div className="welcome">
      <motion.div
        ref={ticketRef}
        className="ticket"
        initial={
          reduced
            ? false
            : { opacity: 0, y: 56, scale: 0.9, rotate: 9, filter: "blur(12px)" }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: -2.5,
          filter: "blur(0px)",
        }}
        transition={{ ...issueSpring, delay: BEAT.ticket }}
      >
        <TicketShape className="ticket__shape" />

        <div className="ticket__face">
          {/* the stub, left of the perforation */}
          <div className="ticket__stub">
            <motion.div
              className="ticket__code"
              /* the bars sweep in behind a moving edge, so the code reads as
                 printed rather than placed */
              initial={reduced ? false : { clipPath: "inset(0% 100% 0% 0%)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
              transition={{
                duration: 0.52,
                ease: [0.16, 1, 0.3, 1],
                delay: BEAT.print,
              }}
            >
              <Barcode seed={displayHandle} className="ticket__bars" />
            </motion.div>
          </div>

          {/* the body, right of the perforation */}
          <div className="ticket__body">
            <motion.span className="ticket__brand" {...line(BEAT.brand)}>
              <PinMark className="ticket__pin" />
              <span className="ticket__brandWord">Pin UI</span>
            </motion.span>
            <motion.span className="ticket__caption" {...line(BEAT.caption)}>
              Waitlist pass
            </motion.span>
            <motion.strong
              className="ticket__name"
              title={email}
              style={layout ? { fontSize: `${layout.size}px` } : undefined}
              {...line(BEAT.name)}
            >
              {(layout?.lines ?? [email]).map((part) => (
                <span className="ticket__emailLine" key={part}>
                  {part}
                </span>
              ))}
            </motion.strong>
            <motion.span
              className="ticket__handle"
              style={
                layout
                  ? { fontSize: `${handleSize(layout.size, scale)}px` }
                  : undefined
              }
              {...line(BEAT.handle)}
            >
              {displayHandle}
            </motion.span>
          </div>
        </div>
      </motion.div>

      <motion.p className="welcome__title" {...line(BEAT.title)}>
        Welcome!!!
      </motion.p>

      <motion.p className="welcome__note" {...line(BEAT.note)}>
        50 spots. You&rsquo;re in.
      </motion.p>

      <motion.div {...line(BEAT.actions)}>
        <TicketActions email={email} handle={displayHandle} />
      </motion.div>
    </div>
  );
}
