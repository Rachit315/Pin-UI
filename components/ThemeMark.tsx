"use client";

import { motion, useReducedMotion } from "motion/react";
import PinMark from "./PinMark";
import { softSpring } from "@/lib/motion";
import { usePinTheme } from "@/lib/theme";

/**
 * The pin, wherever it appears — and the theme switch, everywhere it appears.
 *
 * There are four lockups on this site: the hero's masthead, the rail it hands
 * over to on scroll, the component page's bar, and the workbench sidebar. All
 * four are the same gesture, so all four are this component; only the class
 * names and how hard it flinches under the pointer differ.
 *
 * The turn is a whole number of revolutions read from the theme store, not a
 * local count. Two of these hand the mark to each other in flight through a
 * shared `layoutId`, and a local count would mean the arriving mark started
 * from zero and spun itself back.
 */
export default function ThemeMark({
  buttonClassName,
  markClassName,
  layoutId,
  hover = 1.08,
  tap = 0.92,
  title = "Switch theme",
}: {
  buttonClassName: string;
  markClassName: string;
  /** Set on the two that trade places, so Motion tweens between them. */
  layoutId?: string;
  hover?: number;
  tap?: number;
  title?: string;
}) {
  const reduced = useReducedMotion();
  const { theme, turns, toggleTheme } = usePinTheme();

  const inverted = theme === "crimson";

  return (
    <motion.button
      type="button"
      className={buttonClassName}
      onClick={toggleTheme}
      layoutId={reduced ? undefined : layoutId}
      whileHover={reduced ? undefined : { scale: hover }}
      whileTap={reduced ? undefined : { scale: tap }}
      transition={softSpring}
      title={title}
    >
      <span className="sr-only">
        Switch to the {inverted ? "light" : "crimson"} theme
      </span>
      <motion.span
        className="pinFlip"
        animate={{ rotateY: reduced ? 0 : turns * 360 }}
        transition={softSpring}
      >
        <PinMark className={markClassName} />
      </motion.span>
    </motion.button>
  );
}
