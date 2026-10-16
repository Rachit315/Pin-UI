"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import "./magnify.css";

/**
 * Magnify — a type specimen you inspect with a magnifying glass.
 *
 * A paper poster with one huge letter printed on it. Up close the letter is
 * not ink at all: it is rows of tiny characters, and the lens shows them — the
 * glass carries its own copy of the poster at the zoom you set, kept exactly
 * under the lens as it moves, so the magnification is real rather than a
 * blurred scale. Move to inspect; click (or Enter) to push the zoom further.
 * The lens tilts with its own speed, floats a little at rest, and casts a
 * shadow that lifts when it is held.
 *
 * On arrival the letter's outline traces itself, the ink floods in, and the
 * glass drops into place. Arrow keys move it (Shift for bigger steps) and
 * Escape puts it back. Two themes: cream paper with black ink, or graphite
 * with cream.
 */

/* The poster is drawn in a fixed 500 × 680 space and scaled to fit. */
const W = 500;
const H = 680;
/* The lens is drawn at this glass radius and scaled to `lensRadius`. */
const R0 = 50;
const RIM = 6;
const OFFSTAGE = { x: 600, y: -140 };
const REST = { x: 330, y: 254 };
const HANDLE_ANGLE = 42;
const TINT = 0.38;

const COLORS = {
  light: { paper: "#ebe7da", ink: "#161616" },
  dark: { paper: "#1d1c1a", ink: "#ece6d6" },
};

export type MagnifyProps = {
  theme?: "light" | "dark";
  /** The big letter on the poster. */
  glyph?: string;
  /** The tiny characters it is printed from, seen through the lens. */
  micro?: string;
  /** Magnification at rest. */
  zoom?: number;
  /** Magnification after a click or Enter. */
  zoomMax?: number;
  /** The glass's radius, in poster units (the poster is 500 wide). */
  lensRadius?: number;
  /** The poster's width in px; it never grows past its container. */
  size?: number;
  /** The outline trace and the lens dropping in on arrival. */
  intro?: boolean;
  /** The "Move to inspect" line under the poster. */
  hint?: boolean;
  /** Fired when the zoom toggles. */
  onZoomChange?: (zoomed: boolean) => void;
};

const baseline = (size: number) => 340 + size * 0.36;
const GLYPH_SIZE = 500;
const MICRO_SIZE = 5.6;
const GLYPH_FONT = '"Inter", ui-sans-serif, system-ui, sans-serif';
const MICRO_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/* What the lens sees: rows of micro-type, clipped to the big letter. */
function MicroLayer({ glyph, micro, ink, paper, clipId }: { glyph: string; micro: string; ink: string; paper: string; clipId: string }) {
  const rowH = MICRO_SIZE * 0.93;
  const rows = Math.ceil(H / rowH) + 1;
  const perRow = Math.ceil(W / (MICRO_SIZE * 0.5 * micro.length)) + 2;
  const line = micro.repeat(perRow);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="pmag__micro">
      <defs>
        <clipPath id={clipId}>
          <text x={W / 2} y={baseline(GLYPH_SIZE)} textAnchor="middle" className="pmag__glyph-shape">
            {glyph}
          </text>
        </clipPath>
      </defs>
      <rect width={W} height={H} style={{ fill: paper }} className="pmag__fade" />
      <g clipPath={`url(#${clipId})`} style={{ fill: ink }} className="pmag__microText pmag__fade">
        {Array.from({ length: rows }, (_, i) => (
          <text key={i} x={-(i % 3) * 0.9} y={(i + 1) * rowH}>
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default function Magnify({
  theme = "light",
  glyph = "A",
  micro = "a",
  zoom: zoomRest = 2.6,
  zoomMax = 4.2,
  lensRadius = 50,
  size = 380,
  intro = true,
  hint = true,
  onZoomChange,
}: MagnifyProps) {
  const reduced = useReducedMotion();
  const play = intro && !reduced;
  const uid = useId().replace(/:/g, "");
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [active, setActive] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [landed, setLanded] = useState(!play);
  const colors = COLORS[theme];
  const dark = theme === "dark";
  const letter = (glyph || "A").slice(0, 2);
  const tiny = micro || "a";

  const start = play ? OFFSTAGE : REST;
  const tx = useMotionValue(start.x);
  const ty = useMotionValue(start.y);
  const spring = { stiffness: 260, damping: 28, mass: 0.9 };
  const x = useSpring(tx, spring);
  const y = useSpring(ty, spring);

  /* k scales the whole lens drawing; the inner zoom is divided by k, so the
     magnification you ask for is the magnification you get */
  const k = lensRadius / R0;
  const zoom = useSpring(zoomRest, { stiffness: 200, damping: 22 });
  const innerZoom = useTransform(() => zoom.get() / k);
  const innerX = useTransform(() => R0 - x.get() * innerZoom.get());
  const innerY = useTransform(() => R0 - y.get() * innerZoom.get());
  const tilt = useTransform(() => (reduced ? 0 : Math.max(-8, Math.min(8, x.getVelocity() / 140))));

  /* the poster is drawn at 500 wide and scaled to whatever width it is given */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* the lens drops in once the letter has printed */
  useEffect(() => {
    if (!play) return;
    const t = setTimeout(() => {
      tx.set(REST.x);
      ty.set(REST.y);
    }, 1250);
    const l = setTimeout(() => setLanded(true), 1900);
    return () => {
      clearTimeout(t);
      clearTimeout(l);
    };
  }, [play, tx, ty]);

  useEffect(() => {
    zoom.set(zoomed ? zoomMax : zoomRest);
  }, [zoomed, zoomRest, zoomMax, zoom]);

  const toggleZoom = () => {
    setZoomed((z) => {
      onZoomChange?.(!z);
      return !z;
    });
  };

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!landed || !frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    setActive(true);
    tx.set(clamp((e.clientX - r.left) / scale, W));
    ty.set(clamp((e.clientY - r.top) / scale, H));
  };

  const rest = () => {
    setActive(false);
    if (zoomed) {
      setZoomed(false);
      onZoomChange?.(false);
    }
    tx.set(REST.x);
    ty.set(REST.y);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      setActive(true);
      tx.set(clamp(tx.get() + m[0], W));
      ty.set(clamp(ty.get() + m[1], H));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleZoom();
    } else if (e.key === "Escape") {
      rest();
    }
  };

  const lensOuter = (R0 + RIM) * 2;

  return (
    <div className="pmag" data-theme={theme} style={{ ["--pmag-size" as string]: `${size}px` }}>
      <motion.div
        ref={frameRef}
        role="img"
        aria-label={`Poster of a large letter ${letter} printed from tiny ${tiny} characters, with a magnifying glass. Move the pointer or use the arrow keys to inspect; click or press Enter to zoom.`}
        tabIndex={0}
        className="pmag__frame"
        initial={play ? { opacity: 0, y: 40, rotate: -2.5, scale: 0.96 } : false}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={rest}
        onClick={() => landed && toggleZoom()}
        onKeyDown={onKey}
      >
        <div className="pmag__canvas" style={{ transform: `scale(${scale})` }}>
          {/* the paper, with grain and a soft light across it */}
          <div className="pmag__paper pmag__fade" style={{ background: colors.paper }}>
            <svg className="pmag__grain" aria-hidden>
              <filter id={`${uid}-grain`}>
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix
                  values={
                    dark
                      ? "0 0 0 0 0.9  0 0 0 0 0.88  0 0 0 0 0.82  0 0 0 0.9 0"
                      : "0 0 0 0 0.35  0 0 0 0 0.32  0 0 0 0 0.25  0 0 0 0.9 0"
                  }
                />
              </filter>
              <rect width="100%" height="100%" filter={`url(#${uid}-grain)`} />
            </svg>
            <div className="pmag__sheen" />
          </div>

          {/* the letter: its outline traces, then the ink floods in */}
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="pmag__letter" aria-hidden>
            <g style={{ fill: colors.ink, stroke: colors.ink }} className="pmag__fade">
              <motion.text
                key={letter}
                x={W / 2}
                y={baseline(GLYPH_SIZE)}
                textAnchor="middle"
                className="pmag__glyph-shape"
                style={{ strokeDasharray: 3200 }}
                initial={play ? { strokeDashoffset: 3200, fillOpacity: 0, strokeWidth: 1.5 } : false}
                animate={{ strokeDashoffset: 0, fillOpacity: 1, strokeWidth: 0 }}
                transition={{
                  strokeDashoffset: { delay: 0.3, duration: 1, ease: [0.65, 0, 0.35, 1] },
                  fillOpacity: { delay: 0.95, duration: 0.5, ease: "easeOut" },
                  strokeWidth: { delay: 1.45, duration: 0.3 },
                }}
              >
                {letter}
              </motion.text>
            </g>
          </svg>

          {/* the lens */}
          <motion.div
            className="pmag__lens"
            style={{ x, y }}
            initial={play ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
          >
            <motion.div style={{ scale: k }}>
              <motion.div
                style={{ rotate: tilt }}
                animate={
                  active
                    ? { scale: 1.04 }
                    : landed && !reduced
                      ? { scale: [1, 1.012, 1], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }
                      : { scale: 1 }
                }
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* the shadow it casts on the paper, lifting when held */}
                <motion.div
                  className="pmag__abs"
                  animate={{
                    x: active ? 16 : 9,
                    y: active ? 20 : 12,
                    opacity: (active ? 0.22 : 0.32) * (dark ? 1.6 : 1),
                    filter: active ? "blur(9px)" : "blur(5px)",
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                >
                  <div
                    className="pmag__abs pmag__shadow"
                    style={{ width: lensOuter, height: lensOuter, left: -lensOuter / 2, top: -lensOuter / 2, borderRadius: "50%" }}
                  />
                  <div className="pmag__abs" style={{ transform: `rotate(${HANDLE_ANGLE}deg)`, transformOrigin: "0 0" }}>
                    <div
                      className="pmag__abs pmag__shadow"
                      style={{ width: 125, height: 15, left: R0 + RIM - 4, top: -7.5, borderRadius: 999 }}
                    />
                  </div>
                </motion.div>

                {/* the handle: a steel collar, a ferrule and a black grip */}
                <div className="pmag__abs" style={{ transform: `rotate(${HANDLE_ANGLE}deg)`, transformOrigin: "0 0" }}>
                  <div className="pmag__abs pmag__collar" style={{ left: R0 + RIM - 3, top: -5, width: 30, height: 10 }} />
                  <div className="pmag__abs pmag__ferrule" style={{ left: R0 + RIM + 22, top: -7, width: 10, height: 14 }} />
                  <div className="pmag__abs pmag__grip" style={{ left: R0 + RIM + 31, top: -8, width: 92, height: 16 }} />
                </div>

                {/* the metal rim */}
                <div
                  className="pmag__abs pmag__rim"
                  style={{ width: lensOuter, height: lensOuter, left: -lensOuter / 2, top: -lensOuter / 2 }}
                />

                {/* the glass, carrying its own copy of the poster at the zoom */}
                <div className="pmag__abs pmag__glass" style={{ width: R0 * 2, height: R0 * 2, left: -R0, top: -R0 }}>
                  <motion.div
                    className="pmag__abs"
                    style={{ x: innerX, y: innerY, scale: innerZoom, originX: 0, originY: 0, width: W, height: H }}
                  >
                    <MicroLayer glyph={letter} micro={tiny} ink={colors.ink} paper={colors.paper} clipId={`${uid}-micro`} />
                  </motion.div>
                  <div
                    className="pmag__abs pmag__tint"
                    style={{
                      background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 26%), radial-gradient(circle at 50% 50%, rgba(190,214,190,${TINT * 0.26}) 55%, rgba(120,150,120,${TINT}) 100%)`,
                      boxShadow: `inset 0 0 10px 2px rgba(50,70,50,${TINT * 1.2}), inset 0 0 2px rgba(0,0,0,.6)`,
                    }}
                  />
                  <div className="pmag__abs pmag__glint" />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {hint && (
        <motion.p
          className="pmag__hint"
          initial={play ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: play ? 2 : 0, duration: 0.6 }}
        >
          Move to inspect · Click to zoom
        </motion.p>
      )}
    </div>
  );
}
