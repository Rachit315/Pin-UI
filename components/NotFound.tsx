"use client";

import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import ThemeMark from "./ThemeMark";
import { softSpring } from "@/lib/motion";
import "./not-found.css";

/**
 * The 404 — Figma 415:54 (light) and 415:55 (dark).
 *
 * The two 4s are one arm around the pin, and the arm is a fidget spinner: grab
 * either 4 and drag it round the pin, and let go mid-swing to send it spinning
 * with the speed it was thrown at. Friction bleeds the spin off, and once it
 * has come to rest it glides back upright so the page reads 404 again. The pin
 * itself never turns with it — it is the theme switch, as it is in the nav.
 */

/*
 * The "4" of Neue Montreal Regular, as an outline, so it is the design's own 4
 * on every machine rather than whatever face a visitor happens to have. Font
 * units, y up from the baseline, on a 1000 em.
 */
const FOUR = "M449 0V162H544V242H449V691H359L26 242V162H359V0ZM359 566V242H118Z";
const ADVANCE = 566;
/* the line box at line-height normal: 975 up and 225 down, which is what the frame lays out */
const ASCENT = 975;
const DESCENT = 225;

/** How hard friction bleeds the spin, per second — low, so a good flick runs for a while. */
const FRICTION = 0.85;
/** The fastest it will spin, in degrees per second. */
const MAX_SPIN = 2600;
/** Below this, a spin has come to rest. */
const REST = 6;
/** How long it lies where it stopped before gliding back upright. */
const SETTLE_AFTER = 900;
/** What a keyboard flick is worth. */
const KEY_FLICK = 1100;

function Four({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className="nf__glyph"
      viewBox={`0 ${-ASCENT} ${ADVANCE} ${ASCENT + DESCENT}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* the hit area is the 4's own box, so a thin stroke is never hard to catch */}
      <rect className="nf__hit" x="26" y={-691} width="518" height="691" />
      <path d={FOUR} transform="scale(1 -1)" fill="currentColor" data-side={side} />
    </svg>
  );
}

export default function NotFound() {
  const reduced = useReducedMotion();
  const angle = useMotionValue(0);
  const axisRef = useRef<HTMLDivElement>(null);

  /* everything the gesture needs between events lives here, not in state */
  const spin = useRef({
    dragging: false,
    pointer: -1,
    last: 0,
    samples: [] as { t: number; a: number }[],
    raf: 0,
    velocity: 0,
    settle: 0 as ReturnType<typeof setTimeout> | 0,
    glide: null as ReturnType<typeof animate> | null,
  });

  /* the pointer's angle round the pin, in degrees, and how far it is from it */
  const polar = useCallback((x: number, y: number) => {
    const r = axisRef.current!.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height / 2);
    return { a: (Math.atan2(dy, dx) * 180) / Math.PI, d: Math.hypot(dx, dy) };
  }, []);

  const halt = useCallback(() => {
    const s = spin.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    if (s.settle) clearTimeout(s.settle);
    s.settle = 0;
    s.glide?.stop();
    s.glide = null;
  }, []);

  /* back upright — to the nearest whole turn, so it never unwinds a long way */
  const settle = useCallback(
    (delay: number) => {
      const s = spin.current;
      if (s.settle) clearTimeout(s.settle);
      s.settle = setTimeout(() => {
        s.settle = 0;
        const now = angle.get();
        const target = Math.round(now / 360) * 360;
        if (Math.abs(target - now) < 0.1) {
          angle.set(target);
          return;
        }
        s.glide = animate(
          angle,
          target,
          reduced ? { duration: 0.3, ease: "easeOut" } : { type: "spring", stiffness: 70, damping: 13, mass: 1 },
        );
      }, delay);
    },
    [angle, reduced],
  );

  /* the free spin: velocity carries it, friction bleeds it, and it rests where it stops */
  const coast = useCallback(
    (velocity: number) => {
      const s = spin.current;
      halt();
      s.velocity = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velocity));
      if (reduced || Math.abs(s.velocity) < REST * 4) {
        settle(reduced ? 0 : SETTLE_AFTER / 2);
        return;
      }
      let prev = performance.now();
      const step = (now: number) => {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        angle.set(angle.get() + s.velocity * dt);
        s.velocity *= Math.exp(-FRICTION * dt);
        if (Math.abs(s.velocity) < REST) {
          s.raf = 0;
          settle(SETTLE_AFTER);
          return;
        }
        s.raf = requestAnimationFrame(step);
      };
      s.raf = requestAnimationFrame(step);
    },
    [angle, halt, reduced, settle],
  );

  useEffect(() => () => halt(), [halt]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const s = spin.current;
    halt();
    s.dragging = true;
    s.pointer = event.pointerId;
    s.last = polar(event.clientX, event.clientY).a;
    s.samples = [{ t: performance.now(), a: angle.get() }];
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("nf-grabbing");
    event.preventDefault();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const s = spin.current;
    if (!s.dragging || event.pointerId !== s.pointer) return;
    const { a, d } = polar(event.clientX, event.clientY);
    /* right over the pin the angle swings wildly for a tiny move, so it holds still there */
    if (d < 24) return;
    let delta = a - s.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    s.last = a;
    angle.set(angle.get() + delta);
    const now = performance.now();
    s.samples.push({ t: now, a: angle.get() });
    while (s.samples.length > 2 && now - s.samples[0].t > 100) s.samples.shift();
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const s = spin.current;
    if (!s.dragging || event.pointerId !== s.pointer) return;
    s.dragging = false;
    document.documentElement.classList.remove("nf-grabbing");
    /*
     * The throw is the speed over the last tenth of a second of movement. A
     * pointer that sat still before letting go was stopped on purpose, so that
     * counts as no throw at all.
     */
    const now = performance.now();
    const tail = s.samples[s.samples.length - 1];
    const held = !tail || now - tail.t > 120;
    const recent = held ? [] : s.samples.filter((p) => tail.t - p.t <= 100);
    let velocity = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.012) velocity = (last.a - first.a) / dt;
    }
    coast(velocity);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const s = spin.current;
    const add = (v: number) => coast((s.raf ? s.velocity : 0) + v);
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      add(KEY_FLICK);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      add(-KEY_FLICK);
    }
  }

  const grab = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onKeyDown,
  };

  const arrive = (from: number, delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, x: from, scale: 0.55, rotate: from > 0 ? 24 : -24 },
          animate: { opacity: 1, x: 0, scale: 1, rotate: 0 },
          transition: { ...softSpring, delay },
        };

  return (
    <main className="nf">
      <h1 className="sr-only">Page not found (404)</h1>
      <MobileMenu className="mmenu__toggle--float" />

      <div className="nf__stage">
        {/* the arm: both 4s, turning together round the pin */}
        <motion.div className="nf__arm" style={{ rotate: angle }}>
          <div
            className="nf__four nf__four--left"
            role="button"
            tabIndex={0}
            aria-label="Spin the 404"
            {...grab}
          >
            <motion.div className="nf__in" {...arrive(160, 0.12)}>
              <Four side="left" />
            </motion.div>
          </div>
          <div
            className="nf__four nf__four--right"
            role="button"
            tabIndex={0}
            aria-label="Spin the 404"
            {...grab}
          >
            <motion.div className="nf__in" {...arrive(-160, 0.18)}>
              <Four side="right" />
            </motion.div>
          </div>
        </motion.div>

        {/* the pin: the axis the arm turns on, and the theme switch */}
        <motion.div
          ref={axisRef}
          className="nf__axis"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduced ? { duration: 0.3 } : { type: "spring", stiffness: 320, damping: 18, delay: 0.02 }}
        >
          <ThemeMark buttonClassName="nf__pin" markClassName="nf__mark" hover={1.08} tap={0.9} />
        </motion.div>
      </div>

      <motion.div
        className="nf__foot"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...softSpring, delay: reduced ? 0 : 0.42 }}
      >
        <Link className="nf__home" href="/">
          <span className="nf__label">Back to home</span>
          {/* the site's own arrow: it arrives with the underline, and straightens as it does */}
          <span className="nf__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18 18 6m0 0H8.4M18 6v9.6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>
      </motion.div>
    </main>
  );
}
