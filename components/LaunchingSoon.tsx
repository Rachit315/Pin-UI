"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import PinMark from "./PinMark";
import { usePinTheme } from "@/lib/theme";
import { softSpring, spring } from "@/lib/motion";

/**
 * The landing page: one line and one link, centred on an empty stage.
 *
 * The mark is the theme switch here, the same as it is in the corner of the
 * waitlist page — it is the only thing on the page that is not type.
 *
 * The link carries no arrow at rest; the arrow opens out of nothing on hover or
 * focus and the label goes red with it.
 */
export default function LaunchingSoon() {
  const reduced = useReducedMotion();
  const { theme, toggleTheme } = usePinTheme();
  const [turns, setTurns] = useState(0);
  const [active, setActive] = useState(false);

  function onFlip() {
    toggleTheme();
    setTurns((value) => value + 1);
  }

  const open = active && !reduced;

  return (
    <div className="soon">
      <p className="soon__line">
        <motion.button
          type="button"
          className="soon__mark"
          onClick={onFlip}
          whileHover={reduced ? undefined : { scale: 1.1 }}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          transition={softSpring}
          title="Switch theme"
        >
          <span className="sr-only">
            Switch to the {theme === "light" ? "crimson" : "light"} theme
          </span>
          <motion.span
            className="soon__flip"
            animate={{ rotateY: reduced ? 0 : turns * 360 }}
            transition={softSpring}
          >
            <PinMark className="soon__pin" />
          </motion.span>
        </motion.button>

        <span className="soon__brand">Pin UI</span>
        <span className="soon__rest"> is launching soon</span>
      </p>

      <Link
        href="/waitlist"
        className="soon__link"
        data-active={open ? "true" : undefined}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
      >
        Join Waitlist
        <motion.span
          className="soon__arrow"
          aria-hidden="true"
          initial={false}
          animate={{
            width: open ? 15 : 0,
            opacity: open ? 1 : 0,
            x: open ? 0 : -6,
          }}
          transition={spring}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4.5 12h14m0 0-5.2-5.2M18.5 12l-5.2 5.2"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      </Link>
    </div>
  );
}
