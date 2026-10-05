"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { TESTIMONIALS } from "@/lib/testimonials";
import TestimonialCard from "./TestimonialCard";

/**
 * What people are saying — a row of cards drifting slowly across the page,
 * under a progressive blur at either edge, so it reads as a stream rather than
 * a strip that stops at the gutter.
 *
 * Point at a card and the row eases to a stop while the card opens and its
 * quote rises in, a line at a time; leave and it picks up again. The arrows
 * on the keyboard step it a card either way, and on a phone it can be thrown
 * with a finger and coasts back to its own pace.
 *
 * The row is the list three times over. The drift is one number that wraps
 * around the length of a single copy, and because every copy is identical the
 * wrap lands the same card under the same pixels — the loop has no seam.
 *
 * The landing page shows the first few; the rest are on /testimonials.
 */

const SHOWN = 7;
const LIST = TESTIMONIALS.slice(0, SHOWN);
const N = LIST.length;
const COPIES = 3;
/* the drift, in px a second at a 14px root — scaled with the type below */
const PACE = 34;

export default function Testimonials() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const x = useMotionValue(0);

  /* layout, read off the page */
  const step = useRef(0);
  const span = useRef(0);
  const pace = useRef(PACE);
  /* the drift itself, and how fast it is going right now */
  const pos = useRef(0);
  const vel = useRef(0);
  /* an arrow's nudge, played on top of the drift */
  const nudge = useMotionValue(0);
  const nudging = useRef(false);

  /* the card that is open — one at a time */
  const [open, setOpen] = useState<number | null>(null);
  const openRef = useRef<number | null>(null);
  const hovering = useRef(false);
  /*
   * Every quote is shown openly, set like the page's cards: they are the point
   * of the section, so nobody should have to point at a card to read what was
   * said. The row still drifts, and holds still under the pointer so a card can
   * be read to the end. (The name is kept from when only a screen without hover
   * showed them open.)
   */
  const touch = true;
  const touchRef = useRef(true);
  const panning = useRef(false);
  const onScreen = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* kept on the middle copy, so there is always a full copy either side */
  const wrap = useCallback((v: number) => {
    const s = span.current;
    if (!s) return v;
    return ((((v - s) % s) + s) % s) + s;
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return;
    const a = track.children[0] as HTMLElement;
    const b = track.children[1] as HTMLElement;
    step.current = b.offsetLeft - a.offsetLeft;
    span.current = step.current * N;
    /* the pace follows the type scale, so a phone does not drift twice as fast */
    const root = parseFloat(getComputedStyle(track).fontSize) || 14;
    pace.current = (PACE * root) / 14;
    if (!pos.current) pos.current = span.current;
    pos.current = wrap(pos.current);
    x.set(-wrap(pos.current + nudge.get()));
    /*
     * Room under the row for the tallest quote, so opening a card grows it
     * into space that is already there instead of pushing the page down.
     */
    const tallest = touchRef.current
      ? 0
      : Math.max(0, ...Array.from(track.querySelectorAll<HTMLElement>(".tq__quote"), (q) => q.offsetHeight));
    viewportRef.current?.style.setProperty("--tq-reserve", `${tallest}px`);
  }, [x, nudge, wrap]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [measure, touch]);

  /*
   * The drift. One frame loop, which runs only while the row is on screen and
   * the tab is visible, and writes one transform a frame. The speed is eased
   * toward its target rather than set, so the row slows into a stop under your
   * pointer and gathers itself again when you leave, like something with mass.
   */
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const held = reduced || hovering.current || openRef.current !== null || panning.current;
      const target = held ? 0 : pace.current;
      if (!panning.current) {
        /* a throw bleeds off slower than the drift settles, so it coasts */
        const k = Math.abs(vel.current) > pace.current * 1.5 ? 2.2 : 3.2;
        vel.current += (target - vel.current) * Math.min(1, dt * k);
        pos.current = wrap(pos.current + vel.current * dt);
      }
      x.set(-wrap(pos.current + nudge.get()));
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || document.hidden || !onScreen.current) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const section = sectionRef.current;
    const io = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting;
      if (e.isIntersecting) start();
      else stop();
    });
    if (section) io.observe(section);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [reduced, x, nudge, wrap]);

  /* move the row by a distance, eased, on top of the drift */
  const shift = useCallback(
    (by: number) => {
      if (nudging.current || !by) return;
      nudging.current = true;
      const done = () => {
        pos.current = wrap(pos.current + nudge.get());
        nudge.set(0);
        x.set(-pos.current);
        nudging.current = false;
      };
      if (reduced) {
        nudge.set(by);
        done();
        return;
      }
      void animate(nudge, by, { duration: 0.7, ease: [0.32, 0.72, 0, 1] }).then(done);
    },
    [reduced, x, nudge, wrap],
  );

  /*
   * A card opened by a tap or by the keyboard may be half under the blur at an
   * edge — the drift put it wherever it was. It glides fully into the clear
   * before you read it; one opened by pointing is already where you are.
   */
  const openCard = useCallback(
    (i: number, on: boolean) => {
      /*
       * Open is kept per testimonial, not per card: every copy of it opens
       * together, so when the loop hands the row over to the next copy the
       * card in view is still the open one.
       */
      setOpen(on ? i % N : null);
      /* never move the row out from under a pointer that is resting on it */
      if (!on || hovering.current) return;
      /* stop dead, so the glide below lands exactly where it aims */
      vel.current = 0;
      const card = trackRef.current?.children[i] as HTMLElement | undefined;
      const viewport = viewportRef.current;
      if (!card || !viewport) return;
      const edge = (viewport.querySelector(".tq__edge") as HTMLElement | null)?.offsetWidth ?? 0;
      const box = viewport.getBoundingClientRect();
      const r = card.getBoundingClientRect();
      const left = box.left + edge;
      const right = box.right - edge;
      if (r.left < left) shift(r.left - left);
      else if (r.right > right) shift(Math.min(r.right - right, r.left - left));
    },
    [shift],
  );

  /* the arrow keys step the row a card either way while focus is inside it */
  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setOpen(null);
    shift((e.key === "ArrowRight" ? 1 : -1) * step.current);
  }

  /* a tap anywhere outside closes the open card */
  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.(".tq__card")) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const rise = (delay = 0) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { ...softSpring, delay },
        } as const);

  return (
    <section className="tq" id="testimonials" ref={sectionRef} aria-labelledby="testimonials-heading">
      <motion.div className="tq__head" {...rise()}>
        <h2 id="testimonials-heading" className="tq__title">
          What people are saying?
        </h2>
      </motion.div>

      {/* the way to the rest sits over the row's right-hand end, where the row is heading */}
      <motion.div className="tq__bar" {...rise(0.06)}>
        <Link className="tq__all" href="/testimonials">
          View all testimonials
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17 17 7m0 0H8.5M17 7v8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </motion.div>

      <motion.div
        className="tq__viewport"
        ref={viewportRef}
        data-touch={touch || undefined}
        onKeyDown={onKey}
        /* over the row with a mouse, it holds still so a card can be read */
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") hovering.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") hovering.current = false;
        }}
        /* on a phone it can be dragged, and thrown: it coasts back to its pace */
        onPanStart={(_, info) => {
          if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) panning.current = true;
        }}
        onPan={(_, info) => {
          if (panning.current) pos.current = wrap(pos.current - info.delta.x);
        }}
        onPanEnd={(_, info) => {
          if (!panning.current) return;
          panning.current = false;
          vel.current = Math.max(-2400, Math.min(2400, -info.velocity.x));
        }}
        style={{ touchAction: "pan-y" }}
        {...rise(0.08)}
      >
        <motion.ul className="tq__track" ref={trackRef} style={{ x }}>
          {Array.from({ length: N * COPIES }, (_, i) => (
            <TestimonialCard
              key={i}
              id={`tq-${i}`}
              item={LIST[i % N]}
              open={open === i % N}
              still={touch}
              inRow
              /* only the middle copy is read out and tabbed through */
              hidden={Math.floor(i / N) !== 1}
              onOpen={(on) => openCard(i, on)}
            />
          ))}
        </motion.ul>

        {/* the hero band's edge, the same six layers: a soft blur, no wash */}
        <div className="tq__edge tq__edge--start" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="tq__edge tq__edge--end" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </motion.div>

    </section>
  );
}
