"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { thumbOf, type Entry } from "./registry";
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
export default function ComponentCard({
  entry,
  index,
  priority = false,
}: {
  entry: Entry;
  index: number;
  /** In the first row a page opens on: its still loads straight away, ahead of everything else. */
  priority?: boolean;
}) {
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
    /*
     * The card rises in as it scrolls into view — a CSS scroll-driven animation
     * (.pin-reveal, globals.css), not a JS observer, so a card that is already
     * on screen is painted at first paint rather than held hidden until
     * hydration. Cards side by side are staggered by their column.
     */
    <li className="shelf__cell pin-reveal" ref={cellRef} style={{ "--reveal-i": index % 3 } as React.CSSProperties}>
      <Link className="card" href={`/components/${entry.slug}`}>
        {/* the recording's own field shows behind a clip zoomed out below 1 */}
        <span className="card__frame" style={{ background: entry.clipStage ?? entry.stage }}>
          {/*
            The still is a real image rather than the video's poster: a poster
            cannot be lazy, so every card on the page used to fetch its still at
            once and the first one queued behind the rest. This loads only as
            the card comes near (or first, for the opening row), before any
            script has run; the clip lays over it once it has frames.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card__video"
            src={thumbOf(entry.poster)}
            /* the zoom is a token so the hover lift can compose with it */
            style={{ "--card-zoom": entry.zoom } as React.CSSProperties}
            alt=""
            width={768}
            height={432}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            aria-hidden="true"
          />
          {entry.clip && (
            <video
              className="card__video card__clip"
              ref={videoRef}
              src={near ? entry.clip : undefined}
              style={{ "--card-zoom": entry.zoom } as React.CSSProperties}
              muted
              playsInline
              loop
              /* the source arrives after the card was already in view: start it then */
              onLoadedData={sync}
              preload={near ? "auto" : "none"}
              tabIndex={-1}
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
    </li>
  );
}
