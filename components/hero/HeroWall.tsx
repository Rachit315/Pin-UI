"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LIBRARY, thumbOf } from "../library/registry";

/**
 * The wall of recordings behind the hero's claim — Figma 501:915.
 *
 * Rows of the library's own loops, fading up from almost nothing at the top
 * (10%, 40%, 80%, then full) so the claim reads over the first row and the
 * components come forward as the eye travels down.
 *
 * Every row runs on forever, and they alternate: the first drifts right, the
 * one under it left, then right, then left — a slow weave rather than one band
 * sliding past. Each row is a pass of six tiles repeated as many times as the
 * frame needs, and its offset wraps at exactly one pass width measured from
 * the DOM, so the seam can never be seen. The drift is a CSS animation, run
 * by the compositor at the screen's own rate; since an IntersectionObserver
 * cannot follow a compositor-only move, the clips below read each tile's
 * real place a few times a second instead.
 *
 * Only what can be seen moves. Every tile fetches its clip once it is in the frame and plays
 * only while it stays there, so the wall never decodes more than it shows. The
 * loop itself stops whenever the hero is off screen. Reduced motion, a hidden
 * tab or a data-saver hold everything still.
 */

const COLS = 6;
const ROWS = [0.1, 0.4, 0.8, 1];
/** Drift, in CSS pixels a second; each row a little different so they never line up. */
const SPEEDS = [16, 19, 14, 17];

const CLIPS = LIBRARY.filter((entry) => entry.clip);

/*
 * Which rows get the library first. The wall has room for every clip once
 * (four rows of six), so each tile is a different component — newest first,
 * into the row that reads strongest and sits wholly above the fold (the third,
 * at 80%), then the full-strength row under it, then the faint upper rows.
 * Past twenty-four the oldest wait their turn; under it, the shelf wraps.
 */
const ROW_RANK = [3, 2, 0, 1];
const tileFor = (r: number, c: number) => CLIPS[(ROW_RANK[r] * COLS + c) % CLIPS.length];

export default function HeroWall() {
  const reduced = useReducedMotion();
  const wallRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  /*
   * The server renders one pass of each row — what the frame shows — and the
   * copies the seamless loop needs are added straight after, once the wall
   * has been measured, so the first load hydrates half the tiles.
   */
  const [passes, setPasses] = useState(1);
  /* one pass's width plus the gap after it, per row: the distance a row wraps at */
  const spans = useRef<number[]>(ROWS.map(() => 0));

  /* how many copies of a pass the frame needs, so the track never shows its end */
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const measure = () => {
      trackRefs.current.forEach((track, r) => {
        const pass = track?.firstElementChild as HTMLElement | null;
        if (!track || !pass) return;
        const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
        spans.current[r] = pass.getBoundingClientRect().width + gap;
      });
      const width = spans.current[0];
      if (width) setPasses(Math.max(2, Math.ceil(wall.clientWidth / width) + 1));
      /* the drift is a CSS animation over one pass, at each row's own pace */
      trackRefs.current.forEach((track, r) => {
        const span = spans.current[r];
        if (!track || !span) return;
        track.style.setProperty("--span", `${span}px`);
        track.style.animationDuration = `${span / SPEEDS[r]}s`;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  /*
   * The weave. Each row drifts by a CSS animation (landing.css) rather than a
   * transform written from script every frame: the browser runs it on the
   * compositor at the screen's own refresh rate, and a busy frame elsewhere on
   * the page can no longer make the wall stutter. It starts once the copies
   * the seamless wrap needs exist, and pauses while the hero is off screen.
   */
  const [drifting, setDrifting] = useState(false);
  useEffect(() => {
    setDrifting(!reduced && passes >= 2);
  }, [reduced, passes]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall || typeof IntersectionObserver === "undefined") return;
    const visibility = new IntersectionObserver(([entry]) => {
      wall.toggleAttribute("data-paused", !entry?.isIntersecting);
    });
    visibility.observe(wall);
    return () => visibility.disconnect();
  }, []);

  /*
   * Clips: fetched and played only while their tile is inside the frame.
   *
   * The drift runs on the compositor, where an IntersectionObserver cannot see
   * it, so a tile's place is read from the page itself — a few times a second,
   * and on scroll, only while the hero is on screen. A playing tile is a video
   * being decoded every frame; this keeps that to the ones in view.
   */
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const videos = Array.from(wall.querySelectorAll<HTMLVideoElement>("video"));

    const still = () =>
      reduced ||
      document.hidden ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

    const play = (video: HTMLVideoElement) => {
      if (!video.getAttribute("src")) {
        video.src = video.dataset.src ?? "";
        video.preload = "auto";
      }
      if (video.paused) void video.play().catch(() => {});
    };

    let onScreen = true;
    const sample = () => {
      const frame = wall.getBoundingClientRect();
      const top = Math.max(frame.top, 0);
      const bottom = Math.min(frame.bottom, window.innerHeight);
      const quiet = still() || !onScreen;
      for (const video of videos) {
        const r = video.getBoundingClientRect();
        const w = Math.min(r.right, frame.right) - Math.max(r.left, frame.left);
        const h = Math.min(r.bottom, bottom) - Math.max(r.top, top);
        /* in view: at least a fiftieth of the tile is inside the frame */
        const seen = w > 0 && h > 0 && (w * h) / (r.width * r.height || 1) > 0.02;
        if (seen && !quiet) play(video);
        else if (!video.paused) video.pause();
      }
    };

    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        sample();
      });
    };

    /* the wall itself does not move, so whether the hero is on screen is the observer's to say */
    const visibility =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = Boolean(entry?.isIntersecting);
            sample();
          });
    visibility?.observe(wall);
    const timer = window.setInterval(() => {
      if (onScreen) sample();
    }, 350);
    sample();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", sample);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(queued);
      visibility?.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", sample);
    };
  }, [reduced, passes]);

  return (
    <div className="hwall" ref={wallRef} aria-hidden="true">
      {ROWS.map((opacity, r) => {
        const row = Array.from({ length: COLS }, (_, c) => tileFor(r, c));
        return (
          /* fades up row by row as CSS keyframes (app/hero.css), so the wall is there at first paint */
          <div
            key={r}
            className="hwall__row hwall-in"
            style={{ opacity, "--rise-d": `${0.1 + r * 0.08}s` } as React.CSSProperties}
          >
            <div
              /* even rows (the first, the third) travel right, odd rows left */
              className={`hwall__track ${r % 2 === 0 ? "hwall__track--right" : "hwall__track--left"}`}
              data-drift={drifting || undefined}
              ref={(el) => {
                trackRefs.current[r] = el;
              }}
            >
              {Array.from({ length: passes }, (_, p) => (
                <div key={p} className="hwall__pass">
                  {row.map((entry, c) => (
                    <div key={c} className="hwall__tile" style={{ background: entry.clipStage ?? entry.stage }}>
                      {/*
                        Every tile's still is an image under its clip: the first
                        pass, which the frame opens on, loads at once, and the
                        copies further along the track only as the drift brings
                        them near. Every tile lays its clip over the still once it
                        plays.
                      */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="hwall__media"
                        src={thumbOf(entry.poster)}
                        alt=""
                        width={384}
                        height={227}
                        /*
                         * The opening tiles of each row — all a phone's frame shows at
                         * first — are fetched at once; the rest of the track lazily, as
                         * it comes near, so they never queue ahead of the page itself.
                         */
                        loading={p === 0 && c < 2 ? "eager" : "lazy"}
                        decoding="async"
                      />
                      {/*
                        Every row plays: even the faint top row is plainly seen on
                        the dark page, and a frozen tile there reads as broken. The
                        loops are 960px, and only tiles inside the frame play.
                      */}
                      {(
                        <video
                          className="hwall__media hwall__clip"
                          data-src={entry.clip}
                          muted
                          playsInline
                          loop
                          preload="none"
                          tabIndex={-1}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
