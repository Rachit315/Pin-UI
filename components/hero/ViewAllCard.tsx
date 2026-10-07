"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";

/**
 * The last cell on the shelf — Figma 422:9 (resting) and 422:20 (hovered).
 *
 * At rest it is a field of grey dither; pointed at, the field turns red and
 * the arrow travels in along its own diagonal from below the bottom-left
 * corner to settle in the top-right. Leaving, it carries on the way it was
 * pointing and goes out through the top-right, so it never reverses — the
 * arrow only ever moves forward, the way a link does.
 *
 * The two fields are the design's Bayer 16 × 16 dither of the brand red,
 * computed once into 32px tiles: the effect is static, so a tile reproduces it
 * exactly without asking every visitor's GPU for a shader.
 */
export default function ViewAllCard({
  index,
  total,
  arrowAtRest = false,
}: {
  index: number;
  total: number;
  /**
   * The landing's version (Figma 502:405): red at rest with the arrow already
   * in its corner. Pointed at, the arrow flies out through the top-right and
   * comes straight back in from the bottom-left — the same forward-only
   * motion, as one loop.
   */
  arrowAtRest?: boolean;
}) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLAnchorElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  const canHover = useRef(true);

  /* the arrow's diagonal: one card-width down and to the left is out of sight */
  const offset = () => cardRef.current?.offsetWidth ?? 400;

  useEffect(() => {
    canHover.current = matchMedia("(hover: hover)").matches;
    const arrow = arrowRef.current;
    if (!arrow) return;
    /*
     * A touch screen cannot point at the card first, so it shows the arrow
     * from the start — otherwise nothing on the card would say it goes
     * anywhere.
     */
    if (arrowAtRest) {
      animate(arrow, { x: 0, y: 0, opacity: 1 }, { duration: 0 });
      return;
    }
    if (!canHover.current || reduced) {
      animate(arrow, { x: 0, y: 0, opacity: canHover.current ? 0 : 1 }, { duration: 0 });
    } else {
      const d = offset();
      animate(arrow, { x: -d, y: d, opacity: 1 }, { duration: 0 });
    }
  }, [reduced, arrowAtRest]);

  function enter() {
    const arrow = arrowRef.current;
    if (!arrow || hovered.current || !canHover.current) return;
    hovered.current = true;
    if (arrowAtRest) {
      if (reduced) return;
      const d = offset();
      void animate(arrow, { x: d * 0.45, y: -d * 0.45 }, { duration: 0.26, ease: [0.4, 0, 1, 1] }).then(() => {
        if (!arrowRef.current) return;
        animate(arrowRef.current, { x: [-d * 0.6, 0], y: [d * 0.6, 0] }, { duration: 0.55, ease: [0.16, 1, 0.3, 1] });
      });
      return;
    }
    if (reduced) {
      animate(arrow, { opacity: 1 }, { duration: 0.2 });
      return;
    }
    const d = offset();
    animate(arrow, { x: [-d, 0], y: [d, 0] }, { duration: 0.62, ease: [0.16, 1, 0.3, 1] });
  }

  function leave() {
    const arrow = arrowRef.current;
    if (!arrow || !hovered.current || !canHover.current) return;
    hovered.current = false;
    if (arrowAtRest) return;
    if (reduced) {
      animate(arrow, { opacity: 0 }, { duration: 0.2 });
      return;
    }
    const d = offset();
    /* out through the top-right, then quietly back to its mark below the card */
    void animate(arrow, { x: d * 0.45, y: -d * 0.45 }, { duration: 0.3, ease: [0.4, 0, 1, 1] }).then(() => {
      if (!hovered.current && arrowRef.current) animate(arrowRef.current, { x: -d, y: d }, { duration: 0 });
    });
  }

  return (
    <motion.li
      className="shelf__cell"
      initial={reduced ? undefined : { opacity: 0, y: 28 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...softSpring, delay: index * 0.08 }}
    >
      <Link
        ref={cardRef}
        className={arrowAtRest ? "viewall viewall--lit" : "viewall"}
        href="/components"
        aria-label={`View all ${total} components`}
        onPointerEnter={(e) => e.pointerType === "mouse" && enter()}
        onPointerLeave={(e) => e.pointerType === "mouse" && leave()}
        onFocus={enter}
        onBlur={leave}
      >
        {/*
          An unseen copy of a shelf card's own box: frame, gap and title row.
          It gives this cell exactly the height the cards beside it have, in
          every layout — the design's 406 × 320 is a different shape from the
          cards at most widths, and holding to it stretched the whole row.
        */}
        <span className="card viewall__ghost" aria-hidden="true">
          <span className="card__frame" />
          <span className="card__foot">
            <span className="card__title">View all</span>
          </span>
        </span>

        <span className="viewall__field" aria-hidden="true" />
        <span className="viewall__field viewall__field--lit" aria-hidden="true" />

        <span ref={arrowRef} className="viewall__arrow" aria-hidden="true">
          {/* the Neue Montreal arrow, set at 160px and turned 46° in the design */}
          <svg viewBox="0 0 84 85" fill="none">
            <path d="M5.5 80.5 77 9.5M21 6h56.5v58" stroke="currentColor" strokeWidth="11.5" strokeLinecap="butt" strokeLinejoin="miter" />
          </svg>
        </span>

        <span className="viewall__label" aria-hidden="true">
          View all components
        </span>
      </Link>
    </motion.li>
  );
}
