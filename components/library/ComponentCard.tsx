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
 * The preview is a short loop whose poster is its own first frame — so the
 * still and the moving picture are the same pixels and hovering cannot make
 * the card jump. The still shows from the first paint; the clip is not fetched
 * until the card is near the viewport, and hovering is what starts playback:
 * three clips playing at once behind a landing page is a lot of work for a
 * browser to do for something nobody has looked at yet.
 */
export default function ComponentCard({ entry, index }: { entry: Entry; index: number }) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cellRef = useRef<HTMLLIElement>(null);
  const [near, setNear] = useState(false);

  /* only load the clip once the card is within a screen of the viewport */
  useEffect(() => {
    const cell = cellRef.current;
    if (!cell) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);

  /* back to the first frame, which is exactly the poster, so leaving never jumps */
  const park = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = 0;
    } catch {
      /* nothing has loaded yet, and the poster is already showing */
    }
  }, []);

  function enter() {
    if (reduced) return;
    void videoRef.current?.play().catch(() => {
      /* a browser that refuses to play silently is no reason to break the card */
    });
  }

  function leave() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    park();
  }

  return (
    <motion.li
      className="shelf__cell"
      ref={cellRef}
      initial={reduced ? undefined : { opacity: 0, y: 28 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...softSpring, delay: index * 0.08 }}
    >
      <Link
        className="card"
        href={`/components/${entry.slug}`}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={enter}
        onBlur={leave}
      >
        {/* the recording's own field shows behind a clip zoomed out below 1 */}
        <span className="card__frame" style={{ background: entry.clipStage ?? entry.stage }}>
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
            preload={near ? "metadata" : "none"}
            tabIndex={-1}
            aria-hidden="true"
          />
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
