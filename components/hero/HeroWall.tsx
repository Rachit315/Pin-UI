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
 * the DOM, so the seam can never be seen. The offsets are written from one
 * frame loop rather than by CSS animations: the visibility checks below have
 * to see where a tile really is, and a compositor-only animation would hide
 * that from them.
 *
 * Only what can be seen moves. The top row, at a tenth of its strength, shows
 * stills; every other tile fetches its clip once it is in the frame and plays
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
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  /* the weave: one loop, one transform per row per frame, only while the hero is on screen */
  useEffect(() => {
    const wall = wallRef.current;
    /* the drift wraps a whole pass, so it waits for the copies the measure adds */
    if (!wall || reduced || passes < 2) return;
    let frame = 0;
    let last = 0;
    let onScreen = true;
    const offsets = ROWS.map(() => 0);

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) / 1000 : 0;
      last = now;
      trackRefs.current.forEach((track, r) => {
        const span = spans.current[r];
        if (!track || !span) return;
        offsets[r] = (offsets[r] + SPEEDS[r] * dt) % span;
        /* even rows (the first, the third) travel right, odd rows left */
        const x = r % 2 === 0 ? offsets[r] - span : -offsets[r];
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      });
      if (onScreen) frame = requestAnimationFrame(tick);
    };

    const visibility = new IntersectionObserver(([entry]) => {
      const was = onScreen;
      onScreen = Boolean(entry?.isIntersecting);
      if (onScreen && !was) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    });
    visibility.observe(wall);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
    };
  }, [reduced, passes]);

  /* clips: fetched and played only while their tile is inside the frame */
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall || typeof IntersectionObserver === "undefined") return;
    const videos = Array.from(wall.querySelectorAll<HTMLVideoElement>("video"));
    const seen = new Map<HTMLVideoElement, boolean>();

    const still = () =>
      reduced ||
      document.hidden ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

    const sync = (video: HTMLVideoElement) => {
      if (seen.get(video) && !still()) {
        if (!video.getAttribute("src")) {
          video.src = video.dataset.src ?? "";
          video.preload = "auto";
        }
        if (video.paused) void video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          seen.set(e.target as HTMLVideoElement, e.isIntersecting && e.intersectionRatio > 0.02);
          sync(e.target as HTMLVideoElement);
        }
      },
      { threshold: [0, 0.02, 0.3] },
    );
    videos.forEach((v) => observer.observe(v));
    const onVisibility = () => videos.forEach(sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
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
              className="hwall__track"
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
                        them near. The rows below the faint top one lay their clip
                        over the still once it plays.
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
                      {r !== 0 && (
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
