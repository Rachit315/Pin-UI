"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import PinMark from "./PinMark";
import { usePinTheme } from "@/lib/theme";
import { softSpring } from "@/lib/motion";

/**
 * The lockup in the top-left corner (Figma 240:56).
 *
 * Only the pin itself is the theme switch — the "Pin UI" wordmark beside it is
 * plain text and is deliberately outside the button.
 */
export default function BrandMark() {
  const reduced = useReducedMotion();
  const { theme, toggleTheme } = usePinTheme();
  const [turns, setTurns] = useState(0);

  function onFlip() {
    toggleTheme();
    setTurns((value) => value + 1);
  }

  return (
    <motion.div
      className="brand"
      initial={reduced ? false : { opacity: 0, y: -12, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...softSpring, delay: 0.05 }}
    >
      <motion.button
        type="button"
        className="brand__mark"
        onClick={onFlip}
        whileHover={reduced ? undefined : { scale: 1.08 }}
        whileTap={reduced ? undefined : { scale: 0.92 }}
        transition={softSpring}
        title="Switch theme"
      >
        <span className="sr-only">
          Switch to the {theme === "light" ? "crimson" : "light"} theme
        </span>
        <motion.span
          className="brand__flip"
          animate={{ rotateY: reduced ? 0 : turns * 360 }}
          transition={softSpring}
        >
          <PinMark className="brand__pin" />
        </motion.span>
      </motion.button>

      <span className="brand__word">Pin UI</span>
    </motion.div>
  );
}
