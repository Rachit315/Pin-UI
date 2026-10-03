"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import type { Entry } from "./registry";
import CreatorDot from "./CreatorDot";

/**
 * A card on the shelf.
 *
 * The preview is a short loop whose poster is its own first frame, so the
 * still and the moving picture are the same pixels and starting it can never
 * make the card jump. The still shows from the first paint. The clip is only
 * fetched once the card comes within a screen of the viewport, and it plays
 * while the card is actually on screen: scroll it into view and it moves,
 * scroll past and it stops, so a long page never has more than the few clips
 * you can see decoding at once.
 *
 * Nothing moves for someone who has asked for reduced motion, or who has
 * asked the browser to save data; a hidden tab pauses everything.
 */
export default function ComponentCard({ entry, index }: { entry: Entry; index: number }) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cellRef = useRef<HTMLLIElement>(null);
  const [near, setNear] = useState(false);
  /* on screen: at least a third of the preview is showing */
  const visible = useRef(false);

  const sync = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const still =
      reduced ||
      document.hidden ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (visible.current && !still) {
      if (video.paused) {
        void video.play().catch(() => {
          /* a browser that refuses to play silently is no reason to break the card */
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
  }, [reduced]);

  useEffect(() => {
    const cell = cellRef.current;
    if (!cell) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    /* fetch the clip once the card is within a screen of the viewport */
    const loader = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          loader.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );

    /* and play it only while it is really in view */
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.current = e.isIntersecting && e.intersectionRatio >= 0.35;
        sync();
      },
      { threshold: [0, 0.35, 0.6] },
    );

    loader.observe(cell);
    watcher.observe(cell);
    document.addEventListener("visibilitychange", sync);
    return () => {
      loader.disconnect();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [sync]);

  return (
    <motion.li
      className="shelf__cell"
      ref={cellRef}
      initial={reduced ? undefined : { opacity: 0, y: 28 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...softSpring, delay: index * 0.08 }}
    >
      <Link className="card" href={`/components/${entry.slug}`}>
        {/* the recording's own field shows behind a clip zoomed out below 1 */}
        <span className="card__frame" style={{ background: entry.clipStage ?? entry.stage }}>
          {entry.clip ? (
            <video
              className="card__video"
              ref={videoRef}
              src={near ? entry.clip : undefined}
              /* the zoom is a token so the hover lift can compose with it */
              style={{ "--card-zoom": entry.zoom } as React.CSSProperties}
              /* the still is there from the first paint, before the clip is even requested */
              poster={entry.poster}
              muted
              playsInline
              loop
              /* the source arrives after the card was already in view: start it then */
              onLoadedData={sync}
              preload={near ? "auto" : "none"}
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : (
            /* not recorded yet: a screenshot, which takes the same hover lift */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="card__video"
              src={entry.poster}
              style={{ "--card-zoom": entry.zoom } as React.CSSProperties}
              alt=""
              width={960}
              height={540}
              loading="lazy"
              decoding="async"
              aria-hidden="true"
            />
          )}
        </span>

        <span className="card__foot">
          <span className="card__title">
            {entry.name}
            {entry.isNew && <span className="card__new">New</span>}
            {entry.creator && <CreatorDot {...entry.creator} />}
          </span>
          {/* the arrow sits at the design's angle and straightens on hover */}
          <span className="card__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18 18 6m0 0H8.4M18 6v9.6"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </Link>
    </motion.li>
  );
}
