"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

/** Where a design is submitted. */
const SUBMIT_URL = "https://tally.so/r/2EQY9e";

/*
 * The notch's own spring: quick to answer, with a little weight as it settles
 * — the way a MacBook's island swells rather than slides.
 */
const NOTCH = { type: "spring", stiffness: 520, damping: 36, mass: 0.85 } as const;
const CONTENT = { type: "spring", stiffness: 460, damping: 34, mass: 0.7 } as const;

/* the shape, in the notch's own em */
const SHUT = 2;
const OPEN = 6.75;
/** How far each shoulder flares out past the body, and how far down it reaches. */
const FLARE = 0.7;
/** The bottom corners: 40px across, as drawn. */
const CORNER = 2.5;
/** A cubic Bézier's reach for a quarter circle. */
const K = 0.5523;

/**
 * The outline, as one path: the top edge, a concave shoulder at each end that
 * leaves the edge flat and turns straight down, then a convex corner that
 * starts exactly where the shoulder ends, at the same angle, and sweeps into
 * the bottom edge. Shut, the corner takes the whole side — one S-curve from the
 * top to the bottom; open, the side runs straight between the two.
 *
 * `w` is the full width including both shoulders; everything is in pixels.
 */
function outline(w: number, h: number, em: number) {
  const f = FLARE * em;
  /*
   * A true circle, never an ellipse: shut, the strip is too short for the full
   * 40px corner, and a corner 40px across but half that deep is the squashed
   * curve that read as an odd radius. It shrinks to fit instead, the same
   * amount both ways.
   */
  const rx = Math.max(0, Math.min(CORNER * em, h - f));
  const ry = rx;
  const k = K;
  const r = (n: number) => Math.round(n * 100) / 100;
  return (
    `path('M0 0H${r(w)}` +
    /* right shoulder: a quarter circle centred out on the edge, curving down into the side */
    `C${r(w - k * f)} 0 ${r(w - f)} ${r(f - k * f)} ${r(w - f)} ${r(f)}` +
    `V${r(h - ry)}` +
    /* right corner: a quarter ellipse into the bottom edge */
    `C${r(w - f)} ${r(h - ry + k * ry)} ${r(w - f - rx + k * rx)} ${r(h)} ${r(w - f - rx)} ${r(h)}` +
    `H${r(f + rx)}` +
    `C${r(f + rx - k * rx)} ${r(h)} ${r(f)} ${r(h - ry + k * ry)} ${r(f)} ${r(h - ry)}` +
    `V${r(f)}` +
    `C${r(f)} ${r(f - k * f)} ${r(k * f)} 0 0 0Z')`
  );
}

/**
 * The notch — Figma 439:159 (shut) and 439:239 (open).
 *
 * A black tab hanging from the top edge of the hero, the way a MacBook's notch
 * hangs from its bezel. Shut, it is a strip with one line; pointed at, it
 * swells, the line grows as it rises into place, and a stamp fades in under it
 * to submit a design.
 *
 * The silhouette is drawn as a path from the live height on every frame of the
 * spring, so the shoulders and corners stay one smooth curve however far open
 * it is. The line is set at its open size and scaled down when shut, so the
 * open state — the one people read — is always crisp.
 *
 * A touch screen cannot point first, so a tap opens it and a tap anywhere else
 * shuts it; a keyboard opens it by tabbing onto the stamp.
 */
export default function SubmitNotch() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* the body's measured width and em, and its height as a live value */
  const [box, setBox] = useState<{ w: number; em: number } | null>(null);
  const height = useMotionValue(0);
  const clipPath = useMotionValue("none");

  /* the outline is redrawn from the live height on every frame, and on any rescale */
  useEffect(() => {
    if (!box) return;
    const draw = (h: number) => clipPath.set(outline(box.w, h, box.em));
    draw(height.get());
    return height.on("change", draw);
  }, [box, height, clipPath]);

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

  /* measure before the first paint, and again whenever the hero rescales */
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const em = parseFloat(getComputedStyle(body).fontSize) || 16;
      setBox((prev) => (prev && prev.w === body.offsetWidth && prev.em === em ? prev : { w: body.offsetWidth, em }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  /* the height follows the state on the notch's spring; a rescale just lands */
  const target = box ? (open ? OPEN : SHUT) * box.em : 0;
  const settled = useRef(false);
  useEffect(() => {
    if (!box) return;
    if (!settled.current) {
      settled.current = true;
      height.set(target);
      return;
    }
    const controls = animate(height, target, reduced ? { duration: 0.15 } : NOTCH);
    return () => controls.stop();
  }, [target, box, reduced, height]);

  /* a tap outside shuts it on touch screens; Escape shuts it anywhere */
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
      <motion.div
        ref={bodyRef}
        className="notch__body"
        data-drawn={box ? "true" : "false"}
        /* until it has been measured the stylesheet's own shape stands in */
        style={box ? { height, clipPath } : undefined}
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
          animate={{ y: open ? 0 : "-0.6em", scale: open ? 1 : 0.75 }}
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
        >
          <span className="notch__stamp" aria-hidden="true" />
          <span className="notch__submitLabel">Submit →</span>
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
