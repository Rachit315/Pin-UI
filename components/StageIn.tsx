"use client";

import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";

/**
 * The centre of the stage on page load: rises out of a blur on the shared
 * spring, a beat after the mark. Purely an entrance — nothing inside it
 * animates on first paint, so the two never fight.
 */
export default function StageIn({
  children,
  delay = 0.16,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="stage__centre"
      initial={reduced ? false : { opacity: 0, y: 16, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...softSpring, delay }}
    >
      {children}
    </motion.div>
  );
}
