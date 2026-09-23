"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import type { Entry } from "./registry";

/**
 * A card on the shelf.
 *
 * The preview is the recording itself, parked on a chosen frame rather than
 * backed by a separate poster image — so the still and the moving picture are
 * the same pixels and hovering cannot make the card jump. Nothing is fetched
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

  /* park it on the frame the card is meant to rest on */
  const park = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = entry.posterTime;
    } catch {
      /* metadata has not arrived yet; the loadedmetadata handler will do it */
    }
  }, [entry.posterTime]);

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
        <span className="card__frame">
          <video
            className="card__video"
            ref={videoRef}
            src={near ? entry.clip : undefined}
            /* the zoom is a token so the hover lift can compose with it */
            style={{ "--card-zoom": entry.zoom } as React.CSSProperties}
            muted
            playsInline
            loop
            preload={near ? "metadata" : "none"}
            tabIndex={-1}
            aria-hidden="true"
            onLoadedMetadata={park}
          />
        </span>

        <span className="card__foot">
          <span className="card__title">{entry.name}</span>
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
