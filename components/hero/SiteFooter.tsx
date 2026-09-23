"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import PinMark from "../PinMark";
import { LINKS } from "@/lib/links";

/** How far the mark may wander from its resting place, in pixels. */
const REACH = 26;

/**
 * The foot of the page: the mark at full size, the wordmark beside it, and the
 * small print.
 *
 * The mark leans toward the pointer. It is driven by two springs off the
 * pointer's position within the footer rather than by a transition on every
 * move, so it trails the cursor with weight instead of snapping to it, and it
 * settles back to centre when the pointer leaves. Only the mark moves — the
 * wordmark beside it stays put, which is what makes the lean read as the mark
 * looking at you rather than the whole lockup sliding about.
 */
export default function SiteFooter() {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);

  /* -1 .. 1 across the footer, before any spring */
  const aimX = useMotionValue(0);
  const aimY = useMotionValue(0);

  const float = { stiffness: 140, damping: 18, mass: 0.7 };
  const leanX = useTransform(useSpring(aimX, float), (v) => v * REACH);
  const leanY = useTransform(useSpring(aimY, float), (v) => v * REACH * 0.6);
  /* a touch of tilt, so it turns toward the pointer rather than just sliding */
  const tilt = useTransform(useSpring(aimX, float), (v) => v * 5);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType === "touch") return;
    const box = hostRef.current?.getBoundingClientRect();
    if (!box) return;

    aimX.set(((event.clientX - box.left) / box.width) * 2 - 1);
    aimY.set(((event.clientY - box.top) / box.height) * 2 - 1);
  }

  function onLeave() {
    aimX.set(0);
    aimY.set(0);
  }

  return (
    <footer className="foot">
      <div
        ref={hostRef}
        className="foot__lockup"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <motion.div
          className="foot__mark"
          style={reduced ? undefined : { x: leanX, y: leanY, rotate: tilt }}
        >
          <PinMark className="foot__markArt" />
        </motion.div>
        <span className="foot__word">Pin UI</span>
      </div>

      <div className="foot__dm">
        <span className="foot__dmLabel">Facing an issue?? DM-</span>
        <a
          className="foot__social"
          href={LINKS.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pin UI on X"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3.5 3.5h4.2l5 6.7 5.6-6.7h2.2l-6.8 8.1 7.2 9.6h-4.2l-5.4-7.2-6 7.2H3.1l7.3-8.7L3.5 3.5Z"
              fill="currentColor"
            />
          </svg>
        </a>
        <a
          className="foot__social"
          href={LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pin UI on GitHub"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.73 2 2.5 6.24 2.5 11.5c0 4.2 2.72 7.76 6.5 9.02.48.09.65-.2.65-.46 0-.23-.01-.98-.01-1.78-2.38.44-3-.58-3.19-1.12-.11-.27-.57-1.12-.98-1.34-.33-.18-.81-.62-.01-.63.75-.01 1.29.69 1.47 .97.86 1.44 2.23 1.04 2.78.79.09-.62.34-1.04.61-1.28-2.12-.24-4.34-1.06-4.34-4.7 0-1.04.37-1.89.98-2.56-.1-.24-.43-1.21.09-2.52 0 0 .8-.25 2.62 .98a9.1 9.1 0 0 1 2.39-.32c.81 0 1.62.11 2.39.32 1.82-1.24 2.62-.98 2.62-.98.52 1.31.19 2.28.1 2.52.61.67.98 1.51.98 2.56 0 3.65-2.23 4.46-4.35 4.7.35.3.65.87.65 1.77 0 1.28-.01 2.3-.01 2.62 0 .25.18.55.65.46A9.53 9.53 0 0 0 21.5 11.5C21.5 6.24 17.27 2 12 2Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </div>

      <div className="foot__bar">
        <p className="foot__small">
          <span>Pin UI © 2026</span>
          <span className="foot__dot" aria-hidden="true">
            ·
          </span>
          <a className="foot__link" href="mailto:rachithakur2006@gmail.com">
            Support: rachithakur2006@gmail.com
          </a>
        </p>

        <p className="foot__small">
          <Link className="foot__link" href="/privacy">
            Privacy Policy
          </Link>
          <span className="foot__dot" aria-hidden="true">
            ·
          </span>
          <Link className="foot__link" href="/terms">
            Terms of Service
          </Link>
          <span className="foot__dot" aria-hidden="true">
            ·
          </span>
          <a className="foot__link" href="/sitemap.xml">
            Sitemap
          </a>
          <span className="foot__dot" aria-hidden="true">
            ·
          </span>
          <a className="foot__link" href="/robots.txt">
            robots.txt
          </a>
        </p>
      </div>
    </footer>
  );
}
