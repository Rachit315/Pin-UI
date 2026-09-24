"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { softSpring } from "@/lib/motion";
import { LIBRARY } from "../library/registry";

/**
 * The band of component previews running across the middle of the hero.
 *
 * The track is driven frame by frame rather than by a CSS animation. That is
 * not a preference: slowing a CSS animation means changing its
 * `animation-duration`, and the browser recomputes the animation's position
 * from its original start time when you do — so the track jumps the instant
 * the pointer arrives. Holding the offset ourselves lets the speed be eased
 * toward its target over a few frames, which reads as the band easing off
 * rather than snagging.
 *
 * The loop is seamless because two things are measured rather than assumed:
 * the offset wraps at exactly one pass width taken from the DOM, so the card
 * that arrives lands precisely where the one that left was; and enough passes
 * are rendered to cover the frame *plus* that wrap, or the tail of the track
 * walks into view and leaves a gap at the right edge.
 *
 * What rides on the track is the recordings themselves, not stills of them.
 * They run continuously, looping, whether or not anybody is pointing at the
 * band — a card that only comes alive under the pointer looks broken on the
 * way past. Each is a short loop cut to open on its component already in
 * motion, with that first frame as a poster — so a card has a picture from
 * the first paint and never has to seek anywhere before it can play. Hovering does one thing and
 * one thing only: it eases the track down to a crawl so a clip can be watched
 * without chasing it across the frame.
 */

/** One card per component on the shelf, in shelf order. */
const CARDS = LIBRARY;

/** Drift speed, in CSS pixels per second. */
const SPEED = 34;

/** What it eases down to while the pointer is over the band. */
const HOVER_SPEED = 7;

/*
 * The posters are the band's first paint, so the browser is told about them in
 * the document head rather than finding them when it lays out the video tags.
 */
function preloadPosters() {
  for (const entry of CARDS) preload(entry.poster, { as: "image", fetchPriority: "high" });
}

export default function HeroMarquee() {
  preloadPosters();
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);

  const [passes, setPasses] = useState(2);
  const [shift, setShift] = useState(0);

  const x = useMotionValue(0);
  const speed = useRef(SPEED);
  const targetSpeed = useRef(SPEED);
  /* read inside the frame loop, so changing it never restarts anything */
  const shiftRef = useRef(0);
  shiftRef.current = shift;

  /* Measure one pass, then render as many as the frame needs. */
  useEffect(() => {
    const measure = () => {
      const pass = passRef.current;
      const rail = railRef.current;
      if (!pass || !rail) return;

      const gap = parseFloat(getComputedStyle(pass).columnGap || "0") || 0;
      /* the gap between two passes belongs to the wrap distance too */
      const distance = pass.getBoundingClientRect().width + gap;
      if (!distance) return;

      setShift(distance);
      /* (passes - 1) * distance has to cover the rail, plus one spare */
      setPasses(Math.max(2, Math.ceil(rail.clientWidth / distance) + 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (railRef.current) observer.observe(railRef.current);
    if (passRef.current) observer.observe(passRef.current);
    return () => observer.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    const distance = shiftRef.current;
    if (!distance || reduced) return;

    /* a tab that was in the background hands back one enormous delta; clamp it
       or the band teleports on the frame the tab comes back */
    const step = Math.min(delta, 64);

    /* ease toward the target speed instead of switching to it */
    speed.current += (targetSpeed.current - speed.current) * (step / 220);

    let next = x.get() - (speed.current * step) / 1000;
    /* wrap by exactly one pass, so the seam is invisible */
    while (next <= -distance) next += distance;
    x.set(next);
  });

  /*
   * The clips are addressed through the DOM rather than through a ref per
   * card. Every pass after the first is a copy of the same three cards, so the
   * number of elements is whatever the measurement decided this frame — and a
   * duplicate that carried on showing a still while its twin played would give
   * the seam away.
   */
  const each = useCallback((run: (video: HTMLVideoElement) => void) => {
    railRef.current?.querySelectorAll("video").forEach(run);
  }, []);

  /*
   * Start them, and keep them started.
   *
   * `autoPlay` covers the first pass; a pass added later by the measurement
   * mounts already playing on most browsers but not all, and a tab that has
   * been in the background comes back with some of them stopped. Running this
   * whenever the pass count settles is idempotent and costs nothing.
   */
  const start = useCallback(
    (video: HTMLVideoElement) => {
      if (reduced) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        /* a browser that refuses to play silently is no reason to break the band */
      });
    },
    [reduced],
  );

  useEffect(() => {
    each(start);
  }, [passes, each, start]);

  /*
   * A hidden tab has its media suspended, and coming back does not undo that
   * on its own — the band would return to a row of stills. Restarting on the
   * way back is the whole fix.
   */
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "visible") each(start);
    };
    document.addEventListener("visibilitychange", wake);
    return () => document.removeEventListener("visibilitychange", wake);
  }, [each, start]);

  function enter() {
    targetSpeed.current = HOVER_SPEED;
  }

  function leave() {
    targetSpeed.current = SPEED;
  }

  return (
    <div
      ref={railRef}
      className="heroRail"
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      <motion.div className="heroRail__track" style={{ x }}>
        {Array.from({ length: passes }, (_, pass) => (
          <div
            key={pass}
            className="heroRail__pass"
            ref={pass === 0 ? passRef : undefined}
            /* only the first pass is in the a11y tree; the rest are duplicates
               that exist to make the loop continuous */
            aria-hidden={pass > 0 ? true : undefined}
          >
            {CARDS.map((entry, slot) => (
              <motion.div
                key={entry.slug}
                className="heroRail__card"
                style={{ background: entry.stage }}
                initial={reduced ? false : { y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  ...softSpring,
                  /* deal them in left to right as the page opens */
                  delay: 0.34 + slot * 0.08,
                }}
              >
                <video
                  className="heroRail__video"
                  src={entry.clip}
                  /* each recording framed its component at its own size */
                  style={{ "--rail-zoom": entry.zoom } as React.CSSProperties}
                  /* on screen from the first paint, long before the loop has loaded */
                  poster={entry.poster}
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="auto"
                  tabIndex={-1}
                  aria-hidden="true"
                  /*
                   * A pass added after the first measurement mounts with
                   * `autoPlay` already spent, and calling play() on it from
                   * the effect is too early — three of nine came back stopped.
                   * This fires the moment each one actually could start.
                   */
                  onCanPlay={(event) => start(event.currentTarget)}
                />
                {/* the band is decorative; the shelf below is where these are
                    named and linked, so a reader is given the name and nothing
                    else — and only once, from the pass that is not a copy */}
                {pass === 0 && <span className="sr-only">{entry.name}</span>}
              </motion.div>
            ))}
          </div>
        ))}
      </motion.div>

      {/* the frame's edges, blurred in steps so the band dissolves into the
          border rather than being chopped off by it */}
      <div className="heroRail__fade heroRail__fade--left" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="heroRail__fade heroRail__fade--right" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
