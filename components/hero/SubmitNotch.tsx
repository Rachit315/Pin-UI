"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Where a design is submitted. */
const SUBMIT_URL = "https://tally.so/r/2EQY9e";

/*
 * The notch's own spring: quick to answer, with a little weight as it settles
 * — the way a MacBook's island swells rather than slides.
 */
const NOTCH = { type: "spring", stiffness: 520, damping: 36, mass: 0.85 } as const;
const CONTENT = { type: "spring", stiffness: 460, damping: 34, mass: 0.7 } as const;

/**
 * The notch — Figma 439:159 (shut) and 439:239 (open).
 *
 * A black tab hanging from the top edge of the hero, the way a MacBook's notch
 * hangs from its bezel. Shut, it is a 20px strip with one small line; pointed
 * at, it swells to 100px, the line grows to twice its size as it rises into
 * place, and a stamp fades in under it to submit a design.
 *
 * Only the height and the corners move: the design keeps the width, so the
 * tab grows down out of the edge rather than spreading along it. The line is
 * set at its open size and scaled down when shut, so the open state — the one
 * people read — is always crisp.
 *
 * A touch screen cannot point first, so a tap opens it and a tap anywhere else
 * shuts it; a keyboard opens it by tabbing onto the stamp.
 */
export default function SubmitNotch() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  /* a short grace on the way out, so grazing the edge never makes it flicker */
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => cancelClose, []);

  /* a tap outside shuts it on touch screens */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const move = reduced ? { duration: 0.15 } : NOTCH;
  const ease = reduced ? { duration: 0.15 } : CONTENT;

  return (
    <motion.div
      ref={rootRef}
      className="notch"
      data-open={open}
      initial={reduced ? false : { y: "-100%" }}
      animate={{ y: 0 }}
      transition={reduced ? { duration: 0 } : { ...NOTCH, delay: 0.5 }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") closeSoon();
      }}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) closeSoon();
      }}
    >
      {/* the two concave shoulders where the notch meets the edge */}
      <span className="notch__shoulder notch__shoulder--left" aria-hidden="true" />
      <span className="notch__shoulder notch__shoulder--right" aria-hidden="true" />

      <motion.div
        className="notch__body"
        initial={false}
        animate={{ height: open ? "6.75em" : "2em" }}
        transition={move}
        onClick={(event) => {
          /* a tap on the strip itself opens it; the stamp inside handles its own */
          if ((event.target as HTMLElement).closest(".notch__submit")) return;
          if (!open) setOpen(true);
        }}
      >
        <motion.p
          className="notch__title"
          initial={false}
          /*
            Set at its open size and scaled to three quarters when shut, which
            centres it in the strip at 15px — large enough to read at a glance.
          */
          animate={{ y: open ? 0 : "-0.64em", scale: open ? 1 : 0.75 }}
          transition={ease}
        >
          Want to submit a design??
        </motion.p>

        <motion.a
          className="notch__submit"
          href={SUBMIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Submit a design (opens in a new tab)"
          initial={false}
          /* it fades in where it sits: nothing about the button moves */
          animate={{ opacity: open ? 1 : 0 }}
          transition={open ? { duration: reduced ? 0.15 : 0.22, delay: reduced ? 0 : 0.1, ease: "easeOut" } : { duration: 0.1 }}
          style={{ pointerEvents: open ? "auto" : "none" }}
          tabIndex={0}
        >
          <span className="notch__stamp" aria-hidden="true" />
          <span className="notch__submitLabel">Submit →</span>
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
