"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import Barcode from "./Barcode";
import PinMark from "./PinMark";
import TicketActions from "./TicketActions";
import TicketShape from "./TicketShape";
import { issueSpring, spring } from "@/lib/motion";

/**
 * Fit the address to the pass, and keep the handle underneath it.
 *
 * The email is the one thing here that has to be shown in full — half an
 * address is worse than a small one — so the type gives way instead of the
 * text. The ceiling comes from the stylesheet, which leaves the breakpoints in
 * charge of how large it can be, and the floor keeps it legible.
 *
 * The handle then follows it down. It is the quieter of the two lines, and a
 * long address that has shrunk below its own handle reads as though the pass
 * were built around the wrong field.
 */
function useTicketType(email: string, min = 11) {
  const emailRef = useRef<HTMLElement | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = emailRef.current;
    if (!el) return;

    const fit = () => {
      /* clear ours first, so a re-fit does not start from the size we last
         shrank it to */
      el.style.fontSize = "";
      const ceiling = parseFloat(getComputedStyle(el).fontSize) || 20;

      /* the box is two lines tall, so overflowing its height is the signal to
         shrink — width never overflows now that the address can wrap */
      let size = ceiling;
      while (size > min && el.scrollHeight > el.clientHeight) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }

      const handle = handleRef.current;
      if (handle) {
        handle.style.fontSize = "";
        const base = parseFloat(getComputedStyle(handle).fontSize) || 16;
        handle.style.fontSize = `${Math.max(10, Math.min(base, size - 3))}px`;
      }
    };

    fit();

    /* the webfont arrives after first paint and is wider than the fallback, so
       whatever fitted against the fallback has to be measured again */
    void document.fonts?.ready.then(fit).catch(() => {
      /* no font loading API — the first fit stands */
    });

    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [email, min]);

  return { emailRef, handleRef };
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
  const { emailRef, handleRef } = useTicketType(email);

  return (
    <div className="welcome">
      <motion.div
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
              ref={emailRef as React.RefObject<HTMLElement>}
              title={email}
              {...line(BEAT.name)}
            >
              {email}
            </motion.strong>
            <motion.span
              className="ticket__handle"
              ref={handleRef as React.RefObject<HTMLSpanElement>}
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
