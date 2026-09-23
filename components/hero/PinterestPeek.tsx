"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { LIBRARY } from "../library/registry";
import { LINKS } from "@/lib/links";
import { softSpring, spring } from "@/lib/motion";
import "./peek.css";

/**
 * The Pinterest mark in the copy, with the board behind it.
 *
 * Hovering it opens a card that follows the pointer and shows the board these
 * components were found on; clicking it goes there.
 *
 * The preview is built rather than embedded. Pinterest answers with
 * `X-Frame-Options: DENY`, so an iframe of the board renders as a refusal in
 * every browser — there is no live frame to be had, and a screenshot service
 * would mean handing the page off to somebody else's server. What is here
 * instead is the board's own contents: its three pins are the three
 * components, and the tiles play the same recordings the shelf does, so the
 * card is live in the only sense that matters and costs nothing off-site.
 *
 * It renders through a portal because the hero clips each line of the claim in
 * order to animate it, and anything opened inside that would be cut off at the
 * line.
 */

/**
 * The card's own box, in real pixels — it lives outside the `em` system.
 *
 * The height is what its contents actually measure, not a round number: the
 * card has to know its own size before it is drawn in order to decide which
 * side of the pointer to open on, and a guess leaves dead space at the bottom.
 */
const CARD = { w: 272, h: 200 };
/** How far it sits from the pointer, and how close it may come to the edge. */
const OFFSET = { x: 18, y: 18 };
const MARGIN = 12;

export default function PinterestPeek({
  /** The mark's own class, so each place it appears keeps its own sizing. */
  className = "hero__pinterest",
}: {
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  /* false until the card has been given its first position this hover */
  const placedRef = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  /*
   * The card trails the pointer rather than being pinned to it. A little lag
   * is what makes it read as something being carried along instead of a box
   * welded to the cursor, and the spring is what carries it.
   */
  const left = useSpring(x, { stiffness: 340, damping: 32, mass: 0.7 });
  const top = useSpring(y, { stiffness: 340, damping: 32, mass: 0.7 });

  /* a portal needs a document, so nothing is rendered until after mount */
  useEffect(() => setReady(true), []);

  const place = useCallback(
    (pointerX: number, pointerY: number, jump = false) => {
      /* flip to the other side of the pointer rather than run off the window */
      const flipX = pointerX + OFFSET.x + CARD.w > window.innerWidth - MARGIN;
      const flipY = pointerY + OFFSET.y + CARD.h > window.innerHeight - MARGIN;

      const wantX = flipX ? pointerX - OFFSET.x - CARD.w : pointerX + OFFSET.x;
      const wantY = flipY ? pointerY - OFFSET.y - CARD.h : pointerY + OFFSET.y;

      const nextX = Math.max(MARGIN, Math.min(wantX, window.innerWidth - CARD.w - MARGIN));
      const nextY = Math.max(MARGIN, Math.min(wantY, window.innerHeight - CARD.h - MARGIN));

      x.set(nextX);
      y.set(nextY);

      /* the first placement is not a move — without this it flies in from 0,0 */
      if (jump) {
        left.jump(nextX);
        top.jump(nextY);
      }
    },
    [x, y, left, top],
  );

  function onEnter(event: React.PointerEvent<HTMLAnchorElement>) {
    /* a touch "enter" fires on tap; there the link is the whole interaction */
    if (event.pointerType === "touch") return;
    place(event.clientX, event.clientY, !placedRef.current);
    placedRef.current = true;
    setOpen(true);
  }

  function onMove(event: React.PointerEvent<HTMLAnchorElement>) {
    if (!open || event.pointerType === "touch") return;
    place(event.clientX, event.clientY);
  }

  function onLeave() {
    placedRef.current = false;
    setOpen(false);
  }

  /* Keyboard: there is no pointer to follow, so it opens beside the mark. */
  function onFocus() {
    const box = anchorRef.current?.getBoundingClientRect();
    if (!box) return;
    place(box.left + box.width / 2, box.bottom, true);
    placedRef.current = true;
    setOpen(true);
  }

  /* a card still up after the page has moved under it is a stuck card */
  useEffect(() => {
    if (!open) return;
    const drop = () => setOpen(false);
    window.addEventListener("scroll", drop, { passive: true });
    window.addEventListener("resize", drop);
    return () => {
      window.removeEventListener("scroll", drop);
      window.removeEventListener("resize", drop);
    };
  }, [open]);

  return (
    <>
      <a
        ref={anchorRef}
        className="peek__trigger"
        href={LINKS.pinterest}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pin UI on Pinterest — the board these components came from"
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onFocus={onFocus}
        onBlur={onLeave}
      >
        <span className={className} aria-hidden="true" />
      </a>

      {ready &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="peek"
                /* decorative: the link it belongs to already says where it goes */
                aria-hidden="true"
                style={{ left, top, width: CARD.w, height: CARD.h }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
                transition={spring}
              >
                <div className="peek__head">
                  <span className="peek__glyph" aria-hidden="true" />
                  <span className="peek__name">Pin UI</span>
                </div>

                <p className="peek__meta">
                  <span className="peek__badge">Public board</span>
                  <span className="peek__dot">·</span>
                  {LIBRARY.length} Pins
                </p>

                <div className="peek__grid">
                  {LIBRARY.map((entry, i) => (
                    <motion.span
                      className="peek__tile"
                      key={entry.slug}
                      style={{ background: entry.stage }}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...softSpring, delay: 0.04 + i * 0.05 }}
                    >
                      <video
                        className="peek__video"
                        src={entry.clip}
                        /*
                         * A shade tighter than the shelf uses. These tiles are
                         * a third the height of a card on the shelf, so the
                         * component inside one is a third the size — the extra
                         * push is what keeps it from reading as a speck on a
                         * field of background.
                         */
                        style={{ "--peek-zoom": entry.zoom * 1.18 } as React.CSSProperties}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="auto"
                        tabIndex={-1}
                        aria-hidden="true"
                        onLoadedMetadata={(event) => {
                          /* open on the frame the pin itself shows */
                          const video = event.currentTarget;
                          if (video.currentTime < 0.05) video.currentTime = entry.posterTime;
                        }}
                        /*
                         * `autoPlay` is spent by the time a clip that was not
                         * already buffered is ready, and the card is only up
                         * for a moment — a tile that never starts is a tile
                         * that is simply a still. This fires when it can.
                         */
                        onCanPlay={(event) => {
                          if (reduced) return;
                          void event.currentTarget.play().catch(() => {
                            /* a refusal to autoplay leaves the still frame up */
                          });
                        }}
                      />
                    </motion.span>
                  ))}
                </div>

                <p className="peek__foot">in.pinterest.com/rachitrampage23/pin-ui</p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
