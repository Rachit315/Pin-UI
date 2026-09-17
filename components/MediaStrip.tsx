"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { playClose, playOpen } from "@/lib/sound";
import { softSpring, spring } from "@/lib/motion";

/**
 * The demo strip peeking up from the bottom edge.
 *
 * It drifts sideways on its own; hovering anywhere over it stops the drift and
 * lifts the clip under the pointer; clicking one raises it clear of the edge,
 * grows it a little and plays the demo on loop. Clicking again — or Esc, or a
 * press anywhere off the strip — sets it back down and stops playback. It never
 * leaves the strip: no modal, no full screen.
 *
 * Only the open clip ever plays, so the page is not decoding every clip at
 * once; the rest sit on their first frame.
 *
 * The loop is seamless because two things are measured rather than assumed:
 *
 *  - the track scrolls by exactly one pass width taken from the DOM, so the
 *    card that arrives lands precisely where the one that left was;
 *  - enough passes are rendered to cover the viewport *plus* that scroll, or
 *    the tail of the track walks into view and leaves a gap at the right edge.
 */

const SOURCES = ["/demo/demo-2.mp4", "/demo/demo-3.mp4", "/demo/demo-4.mp4"];

/** How fast the strip drifts, in CSS pixels per second. */
const SPEED = 26;

export default function MediaStrip() {
  const reduced = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<number, HTMLVideoElement>());

  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [passes, setPasses] = useState(2);
  const [shift, setShift] = useState(0);

  /* Measure one pass, then render as many as the viewport needs. */
  useEffect(() => {
    const measure = () => {
      const pass = passRef.current;
      const strip = stripRef.current;
      if (!pass || !strip) return;

      const gap = parseFloat(getComputedStyle(pass).columnGap || "0") || 0;
      /* the gap between two passes belongs to the scroll distance too */
      const distance = pass.getBoundingClientRect().width + gap;
      if (!distance) return;

      setShift(distance);
      /* (passes - 1) * distance has to cover the viewport, plus one spare */
      setPasses(Math.max(2, Math.ceil(strip.clientWidth / distance) + 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (stripRef.current) observer.observe(stripRef.current);
    if (passRef.current) observer.observe(passRef.current);
    return () => observer.disconnect();
  }, []);

  /* Once the clips have dealt themselves in, drop the staggered delay so a
     hover never waits for it. */
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 1400);
    return () => window.clearTimeout(id);
  }, []);

  /** Only the open clip plays; everything else rewinds to its first frame. */
  useEffect(() => {
    videos.current.forEach((video, index) => {
      if (index === open) {
        void video.play().catch(() => {
          /* autoplay can still be refused — the first frame stays up */
        });
      } else if (!video.paused) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [open]);

  /* the sound must not live inside the state updater — React invokes those
     twice in development, and it would double the effect */
  const openRef = useRef<number | null>(null);
  openRef.current = open;

  const close = useCallback(() => {
    if (openRef.current === null) return;
    playClose();
    setOpen(null);
  }, []);

  /* Esc closes, and so does a press anywhere outside the strip. */
  useEffect(() => {
    if (open === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onDown = (event: PointerEvent) => {
      if (!stripRef.current?.contains(event.target as Node)) close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  function toggle(index: number) {
    if (open === index) {
      close();
      return;
    }
    playOpen();
    setOpen(index);
  }

  /* hold the drift until the distance is known, or the first cycle is wrong */
  const running = shift > 0 && !reduced;

  return (
    <div
      ref={stripRef}
      className="strip"
      data-frozen={open !== null ? "true" : undefined}
      onMouseLeave={() => setHovered(null)}
    >
      <div
        className="strip__track"
        style={
          {
            "--pin-strip-shift": `${shift}px`,
            "--pin-strip-duration": `${shift / SPEED}s`,
            animationPlayState: running ? undefined : "paused",
          } as React.CSSProperties
        }
      >
        {Array.from({ length: passes }, (_, pass) => (
          <div
            key={pass}
            className="strip__pass"
            ref={pass === 0 ? passRef : undefined}
            /* only the first pass is in the tab order and the a11y tree; the
               rest are duplicates that exist to make the loop continuous */
            aria-hidden={pass > 0 ? true : undefined}
          >
            {SOURCES.map((src, slot) => {
              const index = pass * SOURCES.length + slot;
              const isOpen = open === index;
              const isHovered = hovered === index && open === null;

              return (
                <motion.button
                  key={slot}
                  type="button"
                  className="strip__card"
                  style={{ zIndex: isOpen ? 3 : isHovered ? 2 : 1 }}
                  tabIndex={pass > 0 ? -1 : undefined}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Close" : "Play"} demo ${slot + 1}`}
                  onPointerEnter={(event) => {
                    /* a touch "enter" fires on tap and would leave the card
                       stuck lifted, so the lift is for real pointers only */
                    if (event.pointerType !== "touch") setHovered(index);
                  }}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  onClick={() => toggle(index)}
                  initial={reduced ? false : { y: "100%", opacity: 0 }}
                  animate={{
                    y: reduced ? 0 : isOpen ? -120 : isHovered ? -14 : 0,
                    opacity: 1,
                    scale: reduced ? 1 : isOpen ? 1.1 : 1,
                  }}
                  transition={
                    entered
                      ? isOpen
                        ? softSpring
                        : spring
                      : /* deal them in left to right as the page opens */
                        { ...softSpring, delay: 0.34 + slot * 0.07 }
                  }
                >
                  <video
                    ref={(node) => {
                      if (node) videos.current.set(index, node);
                      else videos.current.delete(index);
                    }}
                    className="strip__video"
                    src={src}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    tabIndex={-1}
                    aria-hidden="true"
                    /* nudge off zero so the first frame paints instead of black */
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      if (video.currentTime === 0) video.currentTime = 0.05;
                    }}
                  />

                  {/* progressive blur: six stacked backdrop layers, each masked
                      to start lower down and blurring harder than the last */}
                  <span className="strip__blur" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
