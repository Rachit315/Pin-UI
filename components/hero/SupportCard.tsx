"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { LIBRARY, thumbOf } from "@/components/library/registry";
import { LINKS } from "@/lib/links";
import { lenisRef } from "@/lib/lenis";
import { formatStars, useGitHubStars } from "@/lib/useGitHubStars";
import "./support-card.css";

/**
 * The note a visitor meets on the landing page: Pin UI is open source, and a
 * star on GitHub helps.
 *
 * It waits until the hero has arrived, then rises in the middle of the screen
 * over a soft scrim. Its picture is the site's own work — three component
 * posters pinned to a dotted board with the Pin UI pin, a fresh three on every
 * load — and a star sticker slaps onto the middle one with a small burst. Then
 * a line on what Pin UI is and two answers: Star on GitHub, with the live
 * count, or Maybe later. The cross, Escape and a click outside all mean
 * "later" too.
 *
 * It greets every visit — a first landing, a reload, a new tab — and shows
 * once per visit, so moving around the site and coming back does not bring it
 * up again. Someone who has gone to star the project is not asked again on
 * this browser. While it is open it behaves as a dialog should: focus moves
 * into it and stays there, the page behind holds still, and focus goes back
 * where it was when it closes.
 */

/* long enough for the hero's own entrance to finish first */
const DELAY_MS = 1600;
/* set once someone follows the star link: they have answered */
const STARRED_KEY = "pin-ui-starred";

const rise: Transition = { type: "spring", visualDuration: 0.5, bounce: 0.18 };
const settle: Transition = { type: "spring", visualDuration: 0.6, bounce: 0.22 };
const slap: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.45 };

/* every component with a recording has a lively poster: those are the pictures to pin */
const POOL = LIBRARY.filter((entry) => entry.clip).map((entry) => ({ slug: entry.slug, poster: thumbOf(entry.poster), field: entry.clipStage ?? entry.stage }));
/* where each picture lands on the board: x and y in %, then degrees */
const FAN = [
  [-50, 14, -9],
  [0, 0, 1.5],
  [50, 12, 8],
] as const;
/* the burst around the sticker: where each spark flies to, in px */
const SPARKS = [
  [-30, -26, 0.9],
  [4, -40, 0.7],
  [36, -22, 1],
  [40, 12, 0.6],
  [-38, 6, 0.65],
] as const;

/* where each poster's pin goes in along its top edge, in %: the outer two clear of the middle poster */
const PIN_AT = [26, 50, 74];
/* the last load's three, so a reload never shows the same picture twice running */
const LAST_KEY = "pin-ui-support-last";

/* three different posters, different every load */
function pickThree() {
  let last: string[] = [];
  try {
    last = JSON.parse(sessionStorage.getItem(LAST_KEY) ?? "[]") as string[];
  } catch {
    /* no memory: any three will do */
  }
  const fresh = POOL.filter((p) => !last.includes(p.slug));
  const pool = fresh.length >= 3 ? fresh : [...POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const three = pool.slice(0, 3);
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(three.map((p) => p.slug)));
  } catch {
    /* blocked storage: the next load may repeat one, which is harmless */
  }
  return three;
}

/*
 * Whether it has shown in this page load. It lives in the module, so a reload
 * or a fresh visit starts it over, while moving between pages of the site —
 * which keeps the same page load — does not.
 */
let shownThisLoad = false;

const STAR = "M12 2.8c.3 0 .6.2.7.5l2.3 4.7 5.2.8c.6.1.9.9.4 1.3l-3.8 3.7.9 5.2c.1.6-.6 1.1-1.1.8L12 17.3l-4.6 2.4c-.6.3-1.2-.2-1.1-.8l.9-5.2-3.8-3.7c-.4-.4-.2-1.2.4-1.3l5.2-.8 2.3-4.7c.1-.3.4-.4.7-.4z";
const OCTOCAT =
  "M20 6C12.265 6 6 12.265 6 20C6 26.195 10.0075 31.4275 15.5725 33.2825C16.2725 33.405 16.535 32.985 16.535 32.6175C16.535 32.285 16.5175 31.1825 16.5175 30.01C13 30.6575 12.09 29.1525 11.81 28.365C11.6525 27.9625 10.97 26.72 10.375 26.3875C9.885 26.125 9.185 25.4775 10.3575 25.46C11.46 25.4425 12.2475 26.475 12.51 26.895C13.77 29.0125 15.7825 28.4175 16.5875 28.05C16.71 27.14 17.0775 26.5275 17.48 26.1775C14.365 25.8275 11.11 24.62 11.11 19.265C11.11 17.7425 11.6525 16.4825 12.545 15.5025C12.405 15.1525 11.915 13.7175 12.685 11.7925C12.685 11.7925 13.8575 11.425 16.535 13.2275C17.655 12.9125 18.845 12.755 20.035 12.755C21.225 12.755 22.415 12.9125 23.535 13.2275C26.2125 11.4075 27.385 11.7925 27.385 11.7925C28.155 13.7175 27.665 15.1525 27.525 15.5025C28.4175 16.4825 28.96 17.725 28.96 19.265C28.96 24.6375 25.6875 25.8275 22.5725 26.1775C23.08 26.615 23.5175 27.455 23.5175 28.7675C23.5175 30.64 23.5 32.145 23.5 32.6175C23.5 32.985 23.7625 33.4225 24.4625 33.2825C29.9925 31.4275 34 26.1775 34 20C34 12.265 27.735 6 20 6Z";

export default function SupportCard() {
  const reduced = useReducedMotion();
  const stars = useGitHubStars();
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<typeof POOL>([]);
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLAnchorElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  /*
   * On every visit, once the hero has had its moment — unless this browser
   * has already gone to star it. The moment is counted from the visitor's
   * first move (a scroll, a touch, the pointer, a key) rather than from the
   * load, so the card never lands on a page that is still arriving: someone
   * reading the hero sees it a beat after they start, and a page that loads
   * with nobody there is never interrupted.
   */
  useEffect(() => {
    if (shownThisLoad || POOL.length < 3) return;
    let starred = false;
    try {
      starred = localStorage.getItem(STARRED_KEY) === "1";
    } catch {
      /* blocked storage: ask, as on a first visit */
    }
    if (starred) return;
    let t = 0;
    const EVENTS = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart", "wheel"] as const;
    const stop = () => EVENTS.forEach((e) => window.removeEventListener(e, start));
    function start() {
      stop();
      t = window.setTimeout(() => {
        shownThisLoad = true;
        returnTo.current = document.activeElement as HTMLElement | null;
        setPicks(pickThree());
        setOpen(true);
      }, DELAY_MS);
    }
    EVENTS.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return () => {
      stop();
      window.clearTimeout(t);
    };
  }, []);

  const close = useCallback(() => setOpen(false), []);

  /* while open: the page holds still, Escape closes, and Tab stays inside */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    lenisRef.current?.stop();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const items = [...card.querySelectorAll<HTMLElement>("button, a[href]")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !card.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !card.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    /* the main answer is where focus starts, without drawing a ring on it */
    const focusTimer = window.setTimeout(() => starRef.current?.focus({ preventScroll: true }), 60);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      root.style.overflow = prevOverflow;
      lenisRef.current?.start();
    };
  }, [open, close]);

  const onStar = () => {
    try {
      localStorage.setItem(STARRED_KEY, "1");
    } catch {
      /* blocked storage: it may ask again next time, which is harmless */
    }
    close();
  };

  const count = typeof stars === "number" ? formatStars(stars) : null;
  const starLabel =
    typeof stars === "number"
      ? `Star Pin UI on GitHub — ${stars.toLocaleString("en")} star${stars === 1 ? "" : "s"} so far (opens in a new tab)`
      : "Star Pin UI on GitHub (opens in a new tab)";

  return (
    <AnimatePresence onExitComplete={() => returnTo.current?.focus?.({ preventScroll: true })}>
      {open && (
        <motion.div
          key="support-card"
          className="spc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.22, delay: 0.06 } }}
          transition={{ duration: 0.3 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            ref={cardRef}
            className="spc__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { opacity: 0, y: 14, scale: 0.97, filter: "blur(6px)", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
            }
            transition={rise}
          >
            {/* the board: three posters pinned up, a star stuck on the middle one */}
            <div className="spc__board" aria-hidden="true">
              <div className="spc__fan">
                {picks.map((pick, i) => {
                  const [x, y, r] = FAN[i];
                  return (
                    <motion.span
                      key={pick.slug}
                      className="spc__shot"
                      style={{ zIndex: i === 1 ? 2 : 1 }}
                      initial={reduced ? false : { x: "0%", y: "46%", rotate: 0, opacity: 0, scale: 0.9 }}
                      animate={{ x: `${x}%`, y: `${y}%`, rotate: r, opacity: 1, scale: i === 1 ? 1.05 : 1 }}
                      transition={{ ...settle, delay: 0.12 + (i === 1 ? 0 : 0.08) }}
                    >
                      <span className="spc__photo" style={{ background: pick.field }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pick.poster} alt="" width={640} height={400} decoding="async" />
                      </span>
                      {/* the pin that holds it to the board */}
                      <motion.span
                        className="spc__pin"
                        style={{ left: `${PIN_AT[i]}%` }}
                        initial={reduced ? false : { y: -14, opacity: 0, scale: 1.3 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ ...slap, delay: 0.38 + i * 0.07 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/hero/logo.svg" alt="" width={38} height={45} />
                      </motion.span>
                      {i === 1 && (
                        <span className="spc__sticker-anchor">
                          <motion.span
                            className="spc__sticker"
                            initial={reduced ? false : { scale: 0, rotate: -40, opacity: 0 }}
                            animate={{ scale: 1, rotate: -12, opacity: 1 }}
                            transition={{ ...slap, delay: 0.62 }}
                          >
                            <svg viewBox="0 0 24 24">
                              <path d={STAR} fill="currentColor" />
                            </svg>
                          </motion.span>
                          {!reduced &&
                            SPARKS.map(([sx, sy, s], k) => (
                              <motion.span
                                key={k}
                                className="spc__spark"
                                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                animate={{ x: sx, y: sy, scale: [0, s, 0], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.7, delay: 0.7 + k * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <svg viewBox="0 0 24 24">
                                  <path d={STAR} fill="currentColor" />
                                </svg>
                              </motion.span>
                            ))}
                        </span>
                      )}
                    </motion.span>
                  );
                })}
              </div>
            </div>

            <button type="button" className="spc__close" aria-label="Close" onClick={close}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>

            <div className="spc__body">
              <p className="spc__eyebrow">
                <span className="spc__badge" aria-hidden="true">
                  <svg viewBox="6 6 28 28">
                    <path d={OCTOCAT} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                </span>
                Open source
                <span className="spc__chip">Free</span>
              </p>
              <h2 className="spc__title" id={titleId}>
                Enjoying Pin UI? Leave it a star.
              </h2>
              <p className="spc__text" id={bodyId}>
                Every component here is free and yours to copy. A star on GitHub helps more people find Pin UI — and
                keeps new pins coming off the board.
              </p>

              <div className="spc__actions">
                <a
                  ref={starRef}
                  className="spc__star"
                  href={LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={starLabel}
                  onClick={onStar}
                >
                  <svg className="spc__star-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={STAR} fill="currentColor" />
                  </svg>
                  Star on GitHub
                  {count && (
                    <span className="spc__count" aria-hidden="true">
                      {count}
                    </span>
                  )}
                </a>
                <button type="button" className="spc__later" onClick={close}>
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
