import type { Transition, Variants } from "motion/react";

/**
 * Motion tokens. Everything in Pin UI animates on a spring — no duration-based
 * easing — so movement keeps a single physical character across the UI.
 */

/** The workhorse: quick, confident, almost no overshoot. */
export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.9,
};

/** Softer and longer, for entrances and layout morphs. */
export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 1,
};

/**
 * The ticket being issued: it arrives with some weight behind it and settles
 * rather than snapping, which is what makes it read as an object being handed
 * over instead of a box fading in.
 */
export const issueSpring: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 22,
  mass: 1.1,
};

/** An overdamped spring for exits — travels out with no bounce on the way. */
export const exitSpring: Transition = {
  type: "spring",
  stiffness: 460,
  damping: 46,
  mass: 0.8,
};

/** Loose and bouncy, for small delightful pops (checkmark, chip). */
export const bouncySpring: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 18,
  mass: 0.6,
};

/** Card shell: rises, unblurs, and hands off to its children. */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { ...softSpring, staggerChildren: 0.055, delayChildren: 0.1 },
  },
};

/** Every direct child of the card rides this. */
export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: spring },
};

/** Content that swaps in place (form <-> success). */
export const swapVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: softSpring },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { ...spring, damping: 40 } },
};

/** Invalid-field nudge. */
export const shake = { x: [0, -7, 6, -4, 3, 0] };
