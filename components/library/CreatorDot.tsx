"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * The maker's mark on a component: a small dot that cycles through the seven
 * colours of the rainbow, flickering as it goes, with a tooltip that says who
 * made it and links to them on X.
 *
 * It sits *inside* a link — the sidebar row, the shelf card — so it cannot be
 * a link itself. The dot takes the click (and stops the row from navigating)
 * and opens the profile in a new tab; the real, focusable link lives in the
 * tooltip, which is portalled to the body and so is not nested in anything.
 *
 * On a touch screen the first tap shows the tooltip rather than leaving the
 * page, and the tooltip's own link is what goes to X.
 */
export default function CreatorDot({ handle, url }: { handle: string; url: string }) {
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => setReady(true), []);

  const clear = () => {
    if (showTimer.current !== null) window.clearTimeout(showTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    showTimer.current = hideTimer.current = null;
  };

  /* above the dot, centred on it; below instead if there is no room above */
  const measure = useCallback(() => {
    const dot = dotRef.current;
    if (!dot) return;
    const r = dot.getBoundingClientRect();
    const below = r.top < 64;
    setPlace({ left: r.left + r.width / 2, top: below ? r.bottom + 10 : r.top - 10, below });
  }, []);

  const show = (delay = 70) => {
    clear();
    showTimer.current = window.setTimeout(() => {
      measure();
      setOpen(true);
    }, delay);
  };

  /* a short grace, so the pointer can travel from the dot onto the tooltip */
  const hide = (delay = 160) => {
    clear();
    hideTimer.current = window.setTimeout(() => setOpen(false), delay);
  };

  useEffect(() => clear, []);

  /* a tooltip left behind by a scroll is a stuck tooltip */
  useEffect(() => {
    if (!open) return;
    const drop = () => setOpen(false);
    window.addEventListener("scroll", drop, { passive: true, capture: true });
    window.addEventListener("resize", drop);
    return () => {
      window.removeEventListener("scroll", drop, { capture: true });
      window.removeEventListener("resize", drop);
    };
  }, [open]);

  function onClick(event: React.MouseEvent) {
    /* the row or card around the dot must not navigate */
    event.preventDefault();
    event.stopPropagation();
    if (!open && (event.nativeEvent as PointerEvent).pointerType === "touch") {
      show(0);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <span
        ref={dotRef}
        className="cdot"
        role="img"
        aria-label={`Created by @${handle}`}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") hide();
        }}
        onClick={onClick}
      />

      {ready &&
        createPortal(
          <AnimatePresence>
            {open && place && (
              /*
                Two layers: the outer one is placed by the stylesheet (its
                transform centres it on the dot) and only fades; the inner one
                carries the rise and the scale, so the two transforms never
                overwrite each other.
              */
              <motion.div
                className="cdot-tip"
                data-below={place.below ? "true" : undefined}
                role="tooltip"
                style={{ left: place.left, top: place.top }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onPointerEnter={() => clear()}
                onPointerLeave={() => hide()}
              >
                <motion.div
                  className="cdot-tip__body"
                  initial={reduced ? false : { y: place.below ? -5 : 5, scale: 0.96 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={reduced ? undefined : { y: place.below ? -3 : 3, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                <a className="cdot-tip__link" href={url} target="_blank" rel="noopener noreferrer">
                  <svg className="cdot-tip__x" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3.5 3.5h4.2l5 6.7 5.6-6.7h2.2l-6.8 8.1 7.2 9.6h-4.2l-5.4-7.2-6 7.2H3.1l7.3-8.7L3.5 3.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="cdot-tip__text">
                    Created by <strong className="cdot-tip__handle">@{handle}</strong>
                  </span>
                </a>
                <span className="cdot-tip__arrow" aria-hidden="true" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
