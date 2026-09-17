"use client";

import { AnimatePresence, motion } from "motion/react";
import { bouncySpring, spring } from "@/lib/motion";

/**
 * The consent checkbox. The white fill pops on a loose spring and the tick is
 * drawn stroke-first with `pathLength`, so it writes itself rather than appearing.
 */
export default function Consent({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="consent"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      transition={spring}
    >
      <motion.span
        className="consent__box"
        aria-hidden="true"
        animate={{ scale: checked ? [1, 0.86, 1.06, 1] : 1 }}
        transition={checked ? { duration: 0.34 } : spring}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span
              key="fill"
              className="consent__fill"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={bouncySpring}
            />
          )}
        </AnimatePresence>

        <svg
          className="consent__tick"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M4.5 12.6L9.4 17.5L19.5 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ ...spring, delay: checked ? 0.06 : 0 }}
          />
        </svg>
      </motion.span>

      <span>I accept you can tag me on X/Twitter on the launch</span>
    </motion.button>
  );
}
