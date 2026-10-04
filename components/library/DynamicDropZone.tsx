"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  animate,
  AnimatePresence,
  motion,
  useAnimate,
  useMotionValue,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import "./dynamic-drop-zone.css";

/**
 * Dynamic Drop Zone — a file drop zone that turns into a black hole.
 *
 * Carry a file over it and the paper dims through grey into ink: eight dashed
 * rings fall into a tunnel that bends toward the pointer, inner rings leaning
 * furthest, while debris spirals in from the rim. Drop it and the hole pulls
 * itself in, swallows the file, flashes back out to paper — and the innermost
 * ring becomes an upload pill with the others stacked behind it like drawers,
 * a spinner that shrinks into a drawn check, then a reset.
 *
 * It takes real files from the desktop, and carries a demo file of its own,
 * centred under the zone, so it can be tried without one: drag it with a
 * mouse, pen or finger, or focus it and press Enter to watch the drag played
 * for you. There is no panel around it — it sits on whatever it is put on.
 */

export type DynamicDropZoneProps = {
  theme?: "light" | "dark";
  /** The zone's corner radius, 0–40px. */
  corner?: number;
  /** How long the spinner runs before the check lands, in ms. */
  uploadMs?: number;
  /** The draggable demo file under the zone. */
  demoFile?: boolean;
  /** Fired with the files dropped from the desktop — the demo file sends none. */
  onDrop?: (files: File[]) => void;
};

type Phase = "idle" | "over" | "collapse" | "uploading" | "done";

/* lets something other than a native file drag — the demo file — drive the zone */
type ZoneHandle = {
  /* the pointer moved while carrying a file; true while it is over the zone */
  dragMove(x: number, y: number): boolean;
  /* the pointer was released; true when the zone took the file */
  dragEnd(x: number, y: number): boolean;
  /* where a dropped file is swallowed, in viewport coordinates */
  center(): { x: number; y: number } | null;
};

const W = 380;
const H = 280;
const RINGS = 8;
/* the magnet: how far the inner rings may lean toward the pointer */
const PULL_X = 46;
const PULL_Y = 34;
const COLLAPSE_MS = 380;
const DONE_MS = 1700;

const morph: Transition = { type: "spring", visualDuration: 0.5, bounce: 0.18 };
const quick: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };

/*
 * The colours the zone animates between. Motion tweens these as literal
 * values, so they live here rather than in the stylesheet. Every box-shadow
 * keeps the same four-layer shape so it can tween.
 */
type Palette = {
  card: string;
  cardClear: string;
  cardFade: string;
  flash: string;
  flashDeep: string;
  hole: string;
  restShadow: string;
  holeShadow: string;
  ringFirst: string;
  ring: string;
  ringAlpha: number;
  ringStep: number;
  stack: string;
  stackAlpha: number;
  pill: string;
  pillBorder: string;
  text: string;
};

const PALETTES: Record<"light" | "dark", Palette> = {
  light: {
    card: "#ffffff",
    cardClear: "rgba(255, 255, 255, 0)",
    cardFade: "rgba(255, 255, 255, 0.7)",
    flash: "#bfbfc2",
    flashDeep: "#3b3b3f",
    hole: "#030303",
    restShadow:
      "inset 0 0 0 0px rgba(27, 27, 29, 0), inset 0 0 0 0px rgba(58, 58, 62, 0), 0 22px 44px -18px rgba(0, 10, 60, 0.45), 0 2px 6px rgba(0, 10, 60, 0.12)",
    holeShadow:
      "inset 0 0 0 6px rgba(27, 27, 29, 1), inset 0 0 0 7px rgba(58, 58, 62, 1), 0 30px 60px -20px rgba(0, 0, 20, 0.75), 0 2px 8px rgba(0, 0, 20, 0.35)",
    ringFirst: "rgba(150, 140, 175, 0.75)",
    ring: "160 160 170",
    ringAlpha: 0.6,
    ringStep: 0.04,
    stack: "150 150 160",
    stackAlpha: 0.55,
    pill: "#ffffff",
    pillBorder: "rgba(120, 120, 130, 0.75)",
    text: "#71717a",
  },
  dark: {
    card: "#17181c",
    cardClear: "rgba(23, 24, 28, 0)",
    cardFade: "rgba(23, 24, 28, 0.7)",
    flash: "#4a4b52",
    flashDeep: "#232428",
    hole: "#000000",
    restShadow:
      "inset 0 0 0 0px rgba(40, 41, 47, 0), inset 0 0 0 0px rgba(70, 72, 82, 0), 0 22px 44px -18px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)",
    holeShadow:
      "inset 0 0 0 6px rgba(40, 41, 47, 1), inset 0 0 0 7px rgba(70, 72, 82, 1), 0 30px 70px -18px rgba(60, 110, 255, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.1)",
    ringFirst: "rgba(170, 170, 205, 0.4)",
    ring: "200 200 215",
    ringAlpha: 0.3,
    ringStep: 0.02,
    stack: "200 200 215",
    stackAlpha: 0.28,
    pill: "#1e1f24",
    pillBorder: "rgba(200, 200, 215, 0.45)",
    text: "#a1a1aa",
  },
};

export default function DynamicDropZone({
  theme = "light",
  corner = 28,
  uploadMs = 3400,
  demoFile = true,
  onDrop,
}: DynamicDropZoneProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const zone = useRef<ZoneHandle>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  /* the zone is drawn at 380×280 and scaled down, as one, to fit a narrow panel */
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / W));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pdz" data-theme={theme}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.6, bounce: 0.15 }}
        className="pdz__body"
      >
        <div ref={fitRef} className="pdz__fit" style={{ height: H * scale }}>
          <div className="pdz__scaled" style={{ transform: `scale(${scale})` }}>
            <Zone ref={zone} theme={theme} corner={corner} uploadMs={uploadMs} onPhaseChange={setPhase} onDrop={onDrop} />
          </div>
        </div>

        {demoFile && (
          <div className="pdz__tray">
            <DemoFile zone={zone} available={phase === "idle"} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── the zone ────────────────────────────────────────────────────────────── */

type Rect = { left: number; top: number; width: number; height: number; borderRadius: number };

/* idle: tight, evenly spaced rings framing the label */
function idleRect(i: number, radius: number): Rect {
  const inset = 7 + i * 10;
  return {
    left: inset,
    top: inset,
    width: W - inset * 2,
    height: H - inset * 2,
    borderRadius: Math.max(8, radius - 4 - i * 2.2),
  };
}

/* over: a tunnel — the rings bunch up as they fall toward the centre */
const depth = [0.14, 0.33, 0.5, 0.63, 0.73, 0.8, 0.85, 0.88];
function tunnelRect(i: number, radius: number, squeeze = 1): Rect {
  const f = depth[i];
  const w = W * (1 - f) * squeeze;
  const h = H * (1 - f) * squeeze;
  return {
    left: (W - w) / 2,
    top: (H - h) / 2,
    width: w,
    height: h,
    borderRadius: Math.max(6, (radius - 4) * (1 - f) * squeeze + 4),
  };
}

/* uploading: the innermost ring becomes the pill, the rest stack behind it
   like drawers spilling off the bottom edge */
const PILL_W = 200;
const PILL_H = 54;
function stackRect(i: number): Rect {
  const s = RINGS - 1 - i;
  const width = PILL_W + s * 20;
  return {
    left: (W - width) / 2,
    top: H / 2 - PILL_H / 2 + s * 8,
    width,
    height: s === 0 ? PILL_H : H,
    borderRadius: 13 + s,
  };
}

function cardTarget(phase: Phase, prev: Phase, p: Palette): TargetAndTransition {
  switch (phase) {
    case "over":
      /* paper → grey → ink: the zone dims into a hole as the file arrives */
      return {
        scale: 1.07,
        backgroundColor: prev === "idle" ? [p.card, p.flash, p.flashDeep, p.hole] : p.hole,
        boxShadow: p.holeShadow,
        transition: {
          ...morph,
          backgroundColor: { duration: 0.45, times: [0, 0.3, 0.62, 1], ease: "easeOut" },
          boxShadow: { duration: 0.35 },
        },
      };
    case "collapse":
      /* the hole swallows the file and pulls itself in */
      return {
        scale: 0.95,
        backgroundColor: p.hole,
        boxShadow: p.holeShadow,
        transition: { type: "spring", visualDuration: 0.34, bounce: 0 },
      };
    case "uploading":
      /* …then flashes back out to paper */
      return {
        scale: 1,
        backgroundColor: [p.hole, p.flashDeep, p.flash, p.card],
        boxShadow: p.restShadow,
        transition: {
          ...morph,
          backgroundColor: { duration: 0.6, times: [0, 0.28, 0.58, 1], ease: "easeOut" },
          boxShadow: { duration: 0.4 },
        },
      };
    default:
      return {
        scale: 1,
        backgroundColor: p.card,
        boxShadow: p.restShadow,
        transition: { ...morph, backgroundColor: { duration: 0.32 }, boxShadow: { duration: 0.32 } },
      };
  }
}

function Zone({
  ref,
  theme,
  corner,
  uploadMs,
  onPhaseChange,
  onDrop,
}: {
  ref: Ref<ZoneHandle>;
  theme: "light" | "dark";
  corner: number;
  uploadMs: number;
  onPhaseChange: (phase: Phase) => void;
  onDrop?: (files: File[]) => void;
}) {
  const [phase, setPhaseState] = useState<Phase>("idle");
  /* bumps each time the zone flips between paper and hole, so the rings can
     blink out while they rearrange */
  const [flip, setFlip] = useState(0);
  const phaseRef = useRef<Phase>("idle");
  const prevRef = useRef<Phase>("idle");
  const nativeDepth = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const radius = Math.min(40, Math.max(0, corner));
  const p = PALETTES[theme];

  const setPhase = (next: Phase) => {
    const cur = phaseRef.current;
    if (cur === next) return;
    prevRef.current = cur;
    phaseRef.current = next;
    if ((cur === "idle" && next === "over") || (cur === "over" && next === "idle")) setFlip((n) => n + 1);
    setPhaseState(next);
  };

  useEffect(() => {
    onPhaseChange(phase);
  }, [phase, onPhaseChange]);

  /* the pointer's position inside the zone, −1…1 on each axis */
  const mx = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });
  const my = useSpring(0, { stiffness: 220, damping: 22, mass: 0.6 });

  /* a file dropped beside the zone shouldn't make the browser open it */
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    const pending = timers.current;
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
      pending.forEach(clearTimeout);
    };
  }, []);

  const inside = (x: number, y: number) => {
    const r = cardRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const track = (x: number, y: number) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1)));
    my.set(Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1)));
  };

  const release = () => {
    nativeDepth.current = 0;
    mx.set(0);
    my.set(0);
  };

  const accept = () => {
    release();
    timers.current.forEach(clearTimeout);
    setPhase("collapse");
    timers.current = [
      window.setTimeout(() => setPhase("uploading"), COLLAPSE_MS),
      window.setTimeout(() => setPhase("done"), COLLAPSE_MS + uploadMs),
      window.setTimeout(() => setPhase("idle"), COLLAPSE_MS + uploadMs + DONE_MS),
    ];
  };

  const open = () => phaseRef.current === "idle" || phaseRef.current === "over";

  useImperativeHandle(ref, () => ({
    dragMove(x, y) {
      if (!open()) return false;
      const hit = inside(x, y);
      if (hit) {
        track(x, y);
        setPhase("over");
      } else if (phaseRef.current === "over") {
        release();
        setPhase("idle");
      }
      return hit;
    },
    dragEnd(x, y) {
      if (phaseRef.current !== "over") return false;
      if (inside(x, y)) {
        accept();
        return true;
      }
      release();
      setPhase("idle");
      return false;
    },
    center() {
      const r = cardRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    },
  }));

  /* real files dragged in from the desktop */
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragEnter = (e: DragEvent) => {
    if (!open() || !hasFiles(e)) return;
    e.preventDefault();
    nativeDepth.current += 1;
    track(e.clientX, e.clientY);
    setPhase("over");
  };
  const onDragOver = (e: DragEvent) => {
    if (!open() || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    track(e.clientX, e.clientY);
  };
  const onDragLeave = () => {
    if (phaseRef.current !== "over") return;
    nativeDepth.current -= 1;
    if (nativeDepth.current <= 0) {
      release();
      setPhase("idle");
    }
  };
  const onNativeDrop = (e: DragEvent) => {
    e.preventDefault();
    if (phaseRef.current === "over" && e.dataTransfer.files.length > 0) {
      onDrop?.(Array.from(e.dataTransfer.files));
      accept();
    }
  };

  const hole = phase === "over" || phase === "collapse";
  const busy = phase === "uploading" || phase === "done";

  return (
    <div className="pdz__zone" style={{ width: W, height: H }}>
      <motion.div
        ref={cardRef}
        role="region"
        aria-label="File drop zone"
        aria-busy={busy}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onNativeDrop}
        initial={false}
        animate={cardTarget(phase, prevRef.current, p)}
        className="pdz__card"
        style={{ borderRadius: radius }}
      >
        {/* debris being pulled into the hole */}
        <AnimatePresence>
          {hole && (
            <motion.div
              key="debris"
              className="pdz__layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.2 } }}
              exit={{ opacity: 0, transition: quick }}
            >
              <Debris mx={mx} my={my} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* the rings */}
        <div className="pdz__layer">
          {Array.from({ length: RINGS }, (_, i) => (
            <Ring key={i} index={i} phase={phase} flip={flip} radius={radius} palette={p} mx={mx} my={my} />
          ))}
        </div>

        {/* the bottom of the drawer stack fades into the card */}
        <motion.div
          className="pdz__fade"
          initial={false}
          animate={{
            opacity: busy ? 1 : 0,
            backgroundImage: `linear-gradient(to top, ${p.card}, ${p.cardFade}, ${p.cardClear})`,
          }}
          transition={{ duration: 0.3, delay: busy ? 0.25 : 0 }}
        />

        {/* labels */}
        <div className="pdz__layer pdz__labels">
          <AnimatePresence mode="popLayout" initial={false}>
            {phase === "idle" && (
              <motion.div
                key="idle"
                className="pdz__label"
                initial={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                  color: p.text,
                  transition: { ...morph, delay: prevRef.current === "done" ? 0.3 : 0.12, color: { duration: 0.3 } },
                }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.12 } }}
              >
                {/* lucide: paperclip */}
                <svg className="pdz__clip" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Drag file here
              </motion.div>
            )}

            {hole && <HoleLabel key="hole" mx={mx} my={my} sinking={phase === "collapse"} />}

            {busy && (
              <motion.div
                key="busy"
                className="pdz__label pdz__label--busy"
                initial={{ opacity: 0, filter: "blur(6px)", scale: 0.96 }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                  scale: 1,
                  color: p.text,
                  transition: { duration: 0.45, delay: 0.3, ease: "easeOut", color: { duration: 0.3 } },
                }}
                exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.25 } }}
              >
                <span className="pdz__status">
                  <AnimatePresence initial={false}>
                    {phase === "uploading" ? (
                      <motion.span
                        key="spin"
                        className="pdz__statusIcon"
                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } }}
                      >
                        <Spinner />
                      </motion.span>
                    ) : (
                      <motion.span key="check" className="pdz__statusIcon">
                        <DrawnCheck />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                Uploading file(s)...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="pdz__sr" aria-live="polite">
        {phase === "over"
          ? "Release to upload"
          : phase === "uploading"
            ? "Uploading file"
            : phase === "done"
              ? "Upload complete"
              : ""}
      </p>
    </div>
  );
}

function Ring({
  index,
  phase,
  flip,
  radius,
  palette: p,
  mx,
  my,
}: {
  index: number;
  phase: Phase;
  flip: number;
  radius: number;
  palette: Palette;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  /* the inner rings lean further toward the pointer — the tunnel bends */
  const lean = depth[index];
  const x = useTransform(mx, (v) => v * PULL_X * lean);
  const y = useTransform(my, (v) => v * PULL_Y * lean);
  const [scope, animateScope] = useAnimate<HTMLDivElement>();

  /* blink out while the zone swaps between paper and hole, so the rings
     rearrange unseen and fade back in already in their new shape */
  useEffect(() => {
    if (flip === 0) return;
    animateScope(scope.current, { opacity: [1, 0, 0, 1] }, { duration: 0.6, times: [0, 0.15, 0.35, 1], ease: "easeOut" });
  }, [flip, animateScope, scope]);

  const s = RINGS - 1 - index;
  const isPill = s === 0;

  let rect: Rect;
  let borderColor: string;
  let backgroundColor: string;
  if (phase === "over" || phase === "collapse") {
    rect = tunnelRect(index, radius, phase === "collapse" ? 0.82 : 1);
    borderColor = `rgba(255, 255, 255, ${Math.max(0.12, 0.85 - index * 0.11)})`;
    backgroundColor = "rgba(0, 0, 0, 0)";
  } else if (phase === "idle") {
    rect = idleRect(index, radius);
    borderColor = index === 0 ? p.ringFirst : `rgb(${p.ring} / ${p.ringAlpha - index * p.ringStep})`;
    backgroundColor = p.cardClear;
  } else {
    rect = stackRect(index);
    borderColor = isPill ? p.pillBorder : `rgb(${p.stack} / ${p.stackAlpha - s * 0.04})`;
    backgroundColor = isPill ? p.pill : p.card;
  }

  /* the rings travel one after another, so each morph reads as a ripple */
  const order = phase === "over" || phase === "collapse" ? index : s;
  const delay =
    phase === "uploading" ? 0.18 + order * 0.025 : phase === "over" ? 0.1 + order * 0.012 : 0.06 + order * 0.02;

  return (
    <motion.div
      ref={scope}
      className="pdz__ring"
      style={{ x, y, zIndex: phase === "uploading" || phase === "done" ? RINGS - s : index }}
      initial={false}
      animate={{ ...rect, borderColor, backgroundColor }}
      transition={{
        ...morph,
        delay,
        borderColor: { duration: 0.3, delay: phase === "uploading" ? 0.2 : 0 },
        backgroundColor: { duration: 0.3, delay: phase === "uploading" ? 0.2 : 0 },
      }}
    />
  );
}

function HoleLabel({ mx, my, sinking }: { mx: MotionValue<number>; my: MotionValue<number>; sinking: boolean }) {
  /* the label rides with the deepest ring */
  const x = useTransform(mx, (v) => v * PULL_X * depth[RINGS - 1]);
  const y = useTransform(my, (v) => v * PULL_Y * depth[RINGS - 1]);
  return (
    <motion.div style={{ x, y }}>
      <motion.div
        className="pdz__label pdz__label--hole"
        initial={{ opacity: 0, scale: 0.7, filter: "blur(6px)" }}
        animate={
          sinking
            ? { opacity: 0.35, scale: 0.72, filter: "blur(1px)", transition: { duration: 0.3, ease: "easeIn" } }
            : { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...morph, delay: 0.18 } }
        }
        exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)", transition: { duration: 0.15 } }}
      >
        <motion.span
          className="pdz__arrow"
          animate={{ y: [0, 2.5, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* lucide: circle-arrow-down */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8" />
            <path d="m8 12 4 4 4-4" />
          </svg>
        </motion.span>
        Release file
      </motion.div>
    </motion.div>
  );
}

/* bits of matter spiralling in from the rim; each starts somewhere around the
   edge and shrinks to nothing at the core */
const debris = [
  { a: 200, r: 1.05, s: 20, kind: "sq", d: 3.2, delay: 0 },
  { a: 335, r: 1.0, s: 16, kind: "sq", d: 2.8, delay: 0.6 },
  { a: 95, r: 1.02, s: 7, kind: "dot", d: 2.4, delay: 0.3 },
  { a: 20, r: 1.08, s: 22, kind: "sq", d: 3.6, delay: 1.2 },
  { a: 260, r: 0.95, s: 6, kind: "dot", d: 2.2, delay: 1.5 },
  { a: 145, r: 1.1, s: 18, kind: "sq", d: 3.4, delay: 2.0 },
  { a: 300, r: 0.9, s: 8, kind: "dot", d: 2.6, delay: 0.9 },
  { a: 60, r: 1.0, s: 14, kind: "sq", d: 3.0, delay: 2.4 },
  { a: 230, r: 1.12, s: 5, kind: "dot", d: 2.0, delay: 1.8 },
  { a: 170, r: 0.92, s: 12, kind: "sq", d: 2.9, delay: 0.2 },
];

function Debris({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  const x = useTransform(mx, (v) => v * PULL_X * 0.7);
  const y = useTransform(my, (v) => v * PULL_Y * 0.7);
  return (
    <motion.div className="pdz__core" style={{ x, y }}>
      {debris.map((d, i) => {
        const rad = (d.a * Math.PI) / 180;
        const sx = Math.cos(rad) * (W / 2) * d.r;
        const sy = Math.sin(rad) * (H / 2) * d.r;
        /* a quarter turn of swirl on the way in */
        const mid = rad + Math.PI / 4;
        const midX = Math.cos(mid) * (W / 4) * d.r;
        const midY = Math.sin(mid) * (H / 4) * d.r;
        return (
          <motion.span
            key={i}
            className={d.kind === "sq" ? "pdz__bit pdz__bit--sq" : "pdz__bit pdz__bit--dot"}
            style={{ width: d.s, height: d.s, marginLeft: -d.s / 2, marginTop: -d.s / 2 }}
            initial={{ x: sx, y: sy, opacity: 0, scale: 1 }}
            animate={{
              x: [sx, midX, 0],
              y: [sy, midY, 0],
              opacity: [0, 0.9, 0],
              scale: [1, 0.7, 0.1],
              rotate: [0, 120, 300],
            }}
            transition={{ duration: d.d, delay: d.delay, repeat: Infinity, ease: [0.55, 0, 0.85, 0.6], times: [0, 0.55, 1] }}
          />
        );
      })}
    </motion.div>
  );
}

/*
 * The spinner turns in the stylesheet rather than through Motion: a rotation
 * on an <svg> root is written as an SVG attribute and never turns it, while a
 * CSS rotation on its wrapper runs on the compositor however busy the page is.
 */
function Spinner() {
  return (
    <span className="pdz__spinner">
      <svg viewBox="0 0 16 16" className="pdz__icon16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.75} />
        <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* the spinner shrinks to a point, then the tick is drawn in */
function DrawnCheck() {
  return (
    <svg viewBox="0 0 16 16" className="pdz__icon16" fill="none">
      <motion.path
        d="M3.2 8.6l3.1 3 6.5-7.2"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 0.32, delay: 0.18, ease: "easeOut" }, opacity: { duration: 0.01, delay: 0.18 } }}
      />
    </svg>
  );
}

/* ── the demo file ───────────────────────────────────────────────────────── */

const NAME = "hund vill ha";

type Carry = "rest" | "dragging" | "flying" | "gone";

/*
 * A file to pick up and drop on the zone, so it can be tried without hunting
 * for something on the desktop. Dragging is pointer-driven — mouse, pen and
 * touch — and draws its own drag image: the file chip, an arrow cursor and a
 * green "copy" badge.
 */
function DemoFile({ zone, available }: { zone: RefObject<ZoneHandle | null>; available: boolean }) {
  const [mode, setMode] = useState<Carry>("rest");
  const [overZone, setOverZone] = useState(false);
  const restRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const flights = useRef<AnimationPlaybackControls[]>([]);

  /* the drag image's anchor is the cursor tip */
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const gScale = useMotionValue(1);
  const gOpacity = useMotionValue(1);

  /* the file comes back once the upload has finished and the zone is ready */
  useEffect(() => {
    if (mode === "gone" && available) setMode("rest");
  }, [mode, available]);

  useEffect(
    () => () => {
      flights.current.forEach((f) => f.stop());
      document.documentElement.classList.remove("pdz-carrying");
    },
    [],
  );

  const restCenter = () => {
    const r = restRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  };

  const pickUp = (x: number, y: number) => {
    flights.current.forEach((f) => f.stop());
    gx.set(x);
    gy.set(y);
    gScale.set(1);
    gOpacity.set(1);
    setMode("dragging");
  };

  const move = (x: number, y: number) => {
    gx.set(x);
    gy.set(y);
    setOverZone(zone.current?.dragMove(x, y) ?? false);
  };

  const putDown = (x: number, y: number) => {
    document.documentElement.classList.remove("pdz-carrying");
    setOverZone(false);
    const taken = zone.current?.dragEnd(x, y) ?? false;
    setMode("flying");
    if (taken) {
      /* swallowed: the drag image is pulled into the hole */
      const c = zone.current?.center() ?? { x, y };
      const ease = [0.55, 0, 0.9, 0.45] as const;
      flights.current = [
        animate(gx, c.x, { duration: 0.34, ease }),
        animate(gy, c.y, { duration: 0.34, ease }),
        animate(gScale, 0.15, { duration: 0.34, ease }),
        animate(gOpacity, 0, { duration: 0.34, ease: "easeIn", onComplete: () => setMode("gone") }),
      ];
    } else {
      /* missed: it slides back to where it was picked up */
      const home = restCenter();
      flights.current = [
        animate(gx, home.x, { type: "spring", visualDuration: 0.4, bounce: 0.2 }),
        animate(gy, home.y, { type: "spring", visualDuration: 0.4, bounce: 0.2 }),
        animate(gOpacity, 0, { duration: 0.3, delay: 0.15, onComplete: () => setMode("rest") }),
      ];
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== "rest" || !available || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    if (mode === "rest") {
      /* a few pixels of travel before it counts as a drag, so a stray click does nothing */
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 4) return;
      document.documentElement.classList.add("pdz-carrying");
      pickUp(e.clientX, e.clientY);
    }
    move(e.clientX, e.clientY);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    if (mode === "dragging") putDown(e.clientX, e.clientY);
  };

  /* keyboard: Enter or Space plays the drag for you */
  const autoplay = () => {
    const c = zone.current?.center();
    if (!c || mode !== "rest" || !available) return;
    const from = restCenter();
    const xs = [from.x, c.x - 210, c.x - 40, c.x + 120, c.x + 135, c.x - 90, c.x + 30, c.x + 10];
    const ys = [from.y, c.y - 40, c.y + 10, c.y + 60, c.y - 70, c.y - 30, c.y + 75, c.y + 5];
    pickUp(from.x, from.y);
    const opts = { duration: 4.2, ease: "easeInOut" as const };
    flights.current = [
      animate(gx, xs, { ...opts, onUpdate: () => move(gx.get(), gy.get()) }),
      animate(gy, ys, { ...opts, onComplete: () => putDown(gx.get(), gy.get()) }),
    ];
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      autoplay();
    }
  };

  const carrying = mode === "dragging" || mode === "flying";

  return (
    <>
      <div className="pdz__file">
        <motion.button
          ref={restRef}
          type="button"
          aria-label={`Demo file "${NAME}". Drag it onto the drop zone, or press Enter to play the drag.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onDragStart={(e) => e.preventDefault()}
          initial={false}
          animate={mode === "gone" ? { opacity: 0, scale: 0.6 } : carrying ? { opacity: 0.45, scale: 1 } : { opacity: 1, scale: 1 }}
          whileHover={mode === "rest" ? { y: -2 } : undefined}
          transition={{ type: "spring", visualDuration: 0.35, bounce: 0.3 }}
          className="pdz__fileButton"
        >
          <FileThumb size="lg" />
          <span className="pdz__fileName">{NAME}</span>
        </motion.button>
        <AnimatePresence initial={false}>
          {mode === "rest" && (
            <motion.p
              key="hint"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="pdz__hint"
            >
              Drag this file onto the drop zone
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {carrying &&
        createPortal(
          <motion.div aria-hidden="true" className="pdz-ghost" style={{ x: gx, y: gy, scale: gScale, opacity: gOpacity }}>
            {/* the chip sits up and to the left of the cursor tip */}
            <div className="pdz-ghost__chip">
              <FileThumb size="sm" />
              <span className="pdz__fileName">{NAME}</span>
            </div>
            <svg className="pdz-ghost__cursor" width="17" height="25" viewBox="0 0 17 25">
              <path d="M1 1v19.5l4.6-4.4 3.1 7.2 3.2-1.4-3.1-7.1h6.4L1 1z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
            </svg>
            <motion.span
              className="pdz-ghost__copy"
              animate={{ scale: overZone ? 1 : 0.85 }}
              transition={{ type: "spring", visualDuration: 0.25, bounce: 0.5 }}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 1.5v9M1.5 6h9" stroke="white" strokeWidth={2.4} strokeLinecap="round" />
              </svg>
            </motion.span>
          </motion.div>,
          document.body,
        )}
    </>
  );
}

function FileThumb({ size }: { size: "lg" | "sm" }) {
  return (
    <span className={`pdz__thumb pdz__thumb--${size}`}>
      {/* lucide: dog */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size === "sm" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.25 16.25h1.5L12 17z" />
        <path d="M16 14v.5" />
        <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309" />
        <path d="M8 14v.5" />
        <path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
      </svg>
    </span>
  );
}
