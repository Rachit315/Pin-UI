"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform, type Transition } from "motion/react";
import PinMark from "../PinMark";
import { softSpring } from "@/lib/motion";
import { LINKS } from "@/lib/links";
import "./footer.css";

/**
 * The foot of every page — Figma 502:1939.
 *
 * A red field with the neon enter key filling it: the lockup and the links
 * across the top, the small print along the bottom. Red in both themes, the
 * way the brand signs off.
 *
 * It moves with the scroll. As the footer comes up the screen the key rises
 * into place from below and settles from a slight zoom, tied to the scroll
 * position itself rather than played on a timer, so it tracks the wheel (and
 * Lenis's easing of it) exactly; the lockup, the links and the small print
 * rise in on a short stagger as they arrive. Reduced motion leaves it still.
 *
 * And the key is a key. Press it — click, tap, or Enter while the footer is on
 * screen — and the hand comes down on it and it sinks into its lit well, then
 * springs back up as you let go. The scene is three layers from Figma 521:30:
 * the desk with the key up, the same desk with the key down (redrawn onto the
 * up scene's perspective so only the key moves), and the hand on its own,
 * which drops by exactly the distance the two drawings put between it.
 */

/* the hand's travel, as a share of the scene's height: 73 of its 864 pixels */
const HAND_DOWN = "8.45%";
/* resting a pointer on the key: the hand leans in, a hair */
const HAND_HOVER = "1.1%";
const pressSpring: Transition = { type: "spring", stiffness: 1100, damping: 46, mass: 0.6 };
const releaseSpring: Transition = { type: "spring", stiffness: 520, damping: 17, mass: 0.7 };
/* a tap that is over in an instant still shows the key going all the way down */
const MIN_PRESS_MS = 140;
export default function SiteFooter() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["22%", "0%"]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const onScreen = useInView(ref, { amount: 0.3 });

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [presses, setPresses] = useState(0);
  const downAt = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const press = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    downAt.current = performance.now();
    setPressed(true);
    setPresses((n) => n + 1);
  }, []);

  const release = useCallback(() => {
    const held = performance.now() - downAt.current;
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), Math.max(0, MIN_PRESS_MS - held));
  }, []);

  useEffect(() => () => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
  }, []);

  /* Enter anywhere, while the footer is in view and nothing else wants the key */
  useEffect(() => {
    if (!onScreen) return;
    const busy = (el: Element | null) =>
      !!el && (el.matches("input, textarea, select, button, a, [contenteditable=''], [contenteditable='true']") || el.closest("[role='dialog']") !== null);
    const down = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || busy(document.activeElement)) return;
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Enter") release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onScreen, press, release]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.6 },
          transition: { ...softSpring, delay },
        } as const);

  return (
    <footer className="pfoot" ref={ref}>
      {/* the window the scene is seen through: everything above the small print */}
      <div className="pfoot__art">
        <motion.div className="pfoot__artInner" style={reduced ? undefined : { y: artY, scale: artScale }}>
          <div className="pfoot__scene" data-pressed={pressed || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pfoot__layer"
              src="/landing/key-up.webp"
              alt=""
              width={1536}
              height={864}
              loading="lazy"
              decoding="async"
            />
            {/* the same desk, the key down in its lit well: shown while pressed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pfoot__layer pfoot__layer--down"
              src="/landing/key-down.webp"
              alt=""
              width={1536}
              height={864}
              loading="lazy"
              decoding="async"
            />
            {/* a flash of light off the key, once per press */}
            <AnimatePresence>
              {!reduced && pressed && (
                <motion.span
                  key={presses}
                  className="pfoot__glow"
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: [0, 0.55, 0], scale: 1.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
                />
              )}
            </AnimatePresence>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              className="pfoot__layer pfoot__hand"
              src="/landing/key-hand.webp"
              alt=""
              width={1536}
              height={864}
              loading="lazy"
              decoding="async"
              initial={false}
              animate={{ y: pressed ? HAND_DOWN : hovered ? HAND_HOVER : "0%" }}
              transition={reduced ? { duration: 0 } : pressed ? pressSpring : releaseSpring}
            />
            {/* the key itself: the only part you can press */}
            <button
              type="button"
              className="pfoot__key"
              aria-label="Press the enter key"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                press();
              }}
              onPointerUp={release}
              onPointerCancel={release}
              onLostPointerCapture={() => pressed && release()}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                  e.preventDefault();
                  press();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") release();
              }}
              onBlur={() => pressed && release()}
            />
          </div>
        </motion.div>
      </div>

      <div className="pfoot__top">
        <motion.div {...rise(0)}>
          <Link className="pfoot__brand" href="/#top" aria-label="Pin UI — home">
            <PinMark className="pfoot__mark" />
            <span className="pfoot__word" aria-hidden="true">
              Pin UI
            </span>
          </Link>
        </motion.div>

        <motion.div className="pfoot__right" {...rise(0.08)}>
          <nav className="pfoot__nav" aria-label="Footer">
            <Link className="pfoot__navLink" href="/#top">
              Home
            </Link>
            <Link className="pfoot__navLink" href="/#components">
              Components
            </Link>
            <Link className="pfoot__navLink" href="/#testimonials">
              Testimonials
            </Link>
          </nav>

          <span className="pfoot__rule" aria-hidden="true" />

          <div className="pfoot__socials">
            <a
              className="pfoot__social"
              href={LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message Pin UI on X"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3.5 3.5h4.2l5 6.7 5.6-6.7h2.2l-6.8 8.1 7.2 9.6h-4.2l-5.4-7.2-6 7.2H3.1l7.3-8.7L3.5 3.5Z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <a
              className="pfoot__social"
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pin UI on GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
                />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div className="pfoot__bar" {...rise(0.16)}>
        <p className="pfoot__small">
          <span>Pin UI © 2026</span>
          <a className="pfoot__link" href={`mailto:${LINKS.email}`}>
            Support: {LINKS.email}
          </a>
        </p>
        <p className="pfoot__small">
          <Link className="pfoot__link" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="pfoot__link" href="/terms">
            Terms of Service
          </Link>
          <a className="pfoot__link" href="/sitemap.xml">
            Sitemap
          </a>
          <a className="pfoot__link" href="/robots.txt">
            robots.txt
          </a>
        </p>
      </motion.div>
    </footer>
  );
}
