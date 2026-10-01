"use client";

import type React from "react";
import { useEffect, useId, useRef } from "react";
import { animate, press, stagger } from "motion/react";
import "./taxi.css";

/* ------------------------------------------------------------------ props -- */

export type TaxiProps = {
  /** How wide the card is drawn, in px. It narrows further on a small screen. */
  width?: number;
  /** The ride's cues — horn, door, engine and the rest. */
  sound?: boolean;
  /** Where the twelve cue files live. Copy public/sounds/taxi into your own public folder. */
  soundBase?: string;
  /** "light" is the yellow cab on a pale page; "dark" turns the card to night, with the cab-yellow glyph and panel lit on it. */
  theme?: "light" | "dark";
  /** Fired with the stars given once a ride has been rated. */
  onRate?: (stars: number) => void;
};

/* ---------------------------------------------------------------- motion -- */

/* snappy for text, smooth for shapes, bouncy for anything let go */
const snappy = { type: "spring", stiffness: 420, damping: 32 } as const;
const smooth = { type: "spring", stiffness: 260, damping: 28 } as const;
const bouncy = { type: "spring", stiffness: 520, damping: 16 } as const;
const inOut = [0.65, 0, 0.35, 1] as const;

const NBSP = " ";

/* ---------------------------------------------------------------- glyphs -- */

/*
 * Every glyph is five shapes, so each pair can morph one to one. Tiny dots
 * stand in for shapes a glyph does not need; they sit inside a same-coloured
 * shape, so they are invisible at rest.
 */
/*
 * A shape is either "ink" or "cab" — a tone, not a colour. The stylesheet
 * resolves the two per theme: ink on cab by day, cab on ink by night.
 */
const INK = "ink";
const CAB = "cab";
const POINTS = 200;

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;

/* proportions from the reference: a thick raised arm, a hanging arm, legs split by a thin gap */
const HEAD = circle(134, 52, 49);
const BODY_UP =
  "M3 25 A23 23 0 0 1 49 23 L54 108 L80 127 Q88 122 110 122 L180 122 Q242 122 242 190 L242 300 A24 24 0 0 1 194 300 L194 212 L188 212 L188 476 A24.5 24.5 0 0 1 139 476 L139 318 L133 318 L133 476 A25 25 0 0 1 83 476 L83 185 L20 143 Q7 136 9 124 Z";
/* the same body, forearm tilted 15° toward the head: the wave's second frame */
const BODY_WAVE =
  "M29.5 21.4 A23 23 0 0 1 74.5 30.6 L57.6 113.3 L80 127 Q88 122 110 122 L180 122 Q242 122 242 190 L242 300 A24 24 0 0 1 194 300 L194 212 L188 212 L188 476 A24.5 24.5 0 0 1 139 476 L139 318 L133 318 L133 476 A25 25 0 0 1 83 476 L83 185 L20 143 Q6 136 9.5 119 Z";
const TAXI_SIGN = "M92 160 Q92 150 102 150 L148 150 Q158 150 158 160 L158 186 L92 186 Z";
const TAXI_BODY =
  "M70 196 L180 196 Q194 196 200 208 L226 290 Q244 294 244 314 L244 408 Q244 420 232 420 L226 420 L226 456 Q226 470 212 470 L190 470 Q176 470 176 456 L176 420 L74 420 L74 456 Q74 470 60 470 L38 470 Q24 470 24 456 L24 420 L18 420 Q6 420 6 408 L6 314 Q6 294 24 290 L50 208 Q56 196 70 196 Z";
const TAXI_GLASS = "M78 216 L172 216 Q178 216 180 222 L198 280 L52 280 L70 222 Q72 216 78 216 Z";
const CHECK_MARK = "M66 336 L88 314 L114 340 L164 284 L186 306 L114 384 Z";

type GlyphName = "person" | "wave" | "taxi" | "check";
type Tone = typeof INK | typeof CAB;
type Shape = { d: string; fill: Tone; ring: Float32Array };

const GLYPH_SRC: Record<GlyphName, [string, Tone][]> = {
  person: [[HEAD, INK], [BODY_UP, INK], [circle(135, 240, 2), INK], [circle(110, 260, 2), INK], [circle(160, 260, 2), INK]],
  wave: [[HEAD, INK], [BODY_WAVE, INK], [circle(135, 240, 2), INK], [circle(110, 260, 2), INK], [circle(160, 260, 2), INK]],
  taxi: [[TAXI_SIGN, INK], [TAXI_BODY, INK], [TAXI_GLASS, CAB], [circle(46, 352, 17), CAB], [circle(204, 352, 17), CAB]],
  check: [[circle(125, 330, 2), INK], [circle(125, 330, 115), INK], [CHECK_MARK, CAB], [circle(100, 330, 2), INK], [circle(150, 330, 2), INK]],
};

/**
 * Each outline as a ring of evenly spaced points, sampled once with the
 * browser's own path geometry — the morph then only has to blend numbers.
 * Every ring is wound the same way, so a morph never turns inside out.
 */
let GLYPHS: Record<GlyphName, Shape[]> | null = null;
function glyphs(): Record<GlyphName, Shape[]> {
  if (GLYPHS) return GLYPHS;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.append(path);
  document.body.append(svg);
  const ring = (d: string) => {
    path.setAttribute("d", d);
    const total = path.getTotalLength();
    const pts: [number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
      const p = path.getPointAtLength((i / POINTS) * total);
      pts.push([p.x, p.y]);
    }
    let area = 0;
    for (let i = 0; i < POINTS; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % POINTS];
      area += x1 * y2 - x2 * y1;
    }
    if (area < 0) pts.reverse();
    return Float32Array.from(pts.flat().map((n) => Math.round(n * 10) / 10));
  };
  const out = {} as Record<GlyphName, Shape[]>;
  (Object.keys(GLYPH_SRC) as GlyphName[]).forEach((name) => {
    out[name] = GLYPH_SRC[name].map(([d, fill]) => ({ d, fill, ring: ring(d) }));
  });
  svg.remove();
  GLYPHS = out;
  return out;
}

/* ----------------------------------------------------------------- sounds -- */

/* relative loudness per cue: the UI ticks sit well under the story moments */
const MIX = {
  tap: 0.35, open: 0.26, cancel: 0.26, ping: 0.14, found: 0.42, tick: 0.2,
  horn: 0.4, door: 0.5, engine: 0.28, done: 0.4, star: 0.36, thanks: 0.3,
} as const;
type Cue = keyof typeof MIX;

/* ------------------------------------------------------------------ ride -- */

const HOME = ["111 Fifth Ave", "New York,", `NY${NBSP} 10003`];
const TRIP = ["Trip total", "$18.40", "3.1 mi · 12 min"];

const ENROUTE_STEPS = [4, 3, 2, 1];
const ENROUTE_MS = 1300;
const RIDE_STEPS = [12, 9, 6, 3, 1];
const RIDE_MS = 1100;

type StateName = "idle" | "searching" | "enroute" | "arrived" | "riding" | "done" | "thanks";
type RideState = {
  status: string;
  lines: string[];
  glyph: GlyphName;
  label: string;
  size: number;
  caption: string;
  panel: "wide" | "compact";
  act: "request" | "cancel" | "board" | null;
  aria: string;
  hint: string;
  track?: boolean;
  stars?: boolean;
};

const STATES: Record<StateName, RideState> = {
  idle: {
    status: "Currently:", lines: HOME, glyph: "person",
    label: "Taxi!", size: 76, caption: "", panel: "wide",
    act: "request", aria: "Request a taxi", hint: "Tap Taxi! to start a ride",
  },
  searching: {
    status: "Hailing…", lines: ["Looking for", "the nearest", "yellow cab"], glyph: "person",
    label: "Finding", size: 46, caption: "tap to cancel", panel: "compact",
    act: "cancel", aria: "Finding a taxi. Tap to cancel", hint: "Matching you with a nearby driver",
  },
  enroute: {
    status: "Driver found", lines: ["Marco · 4.9★", "Toyota Camry", "Cab 5T42"], glyph: "taxi",
    label: "4 min", size: 68, caption: "away · tap to cancel", panel: "wide", track: true,
    act: "cancel", aria: "Taxi on the way. Tap to cancel", hint: "Your cab is heading to you",
  },
  arrived: {
    status: "It's here!", lines: ["Cab 5T42", "is waiting at", "111 Fifth Ave"], glyph: "taxi",
    label: "Get in", size: 70, caption: "tap once you're in", panel: "wide",
    act: "board", aria: "Taxi arrived. Tap once you're in", hint: "Look for the yellow Camry at the curb",
  },
  riding: {
    status: "Heading to:", lines: ["245 W 25th St", "New York,", `NY${NBSP} 10001`], glyph: "taxi",
    label: "12 min", size: 68, caption: "to destination", panel: "wide", track: true,
    act: null, aria: "Riding. 12 minutes to destination", hint: "Sit back, you're on your way",
  },
  done: {
    status: "Arrived", lines: TRIP, glyph: "check",
    label: "", size: 68, caption: "", panel: "wide", stars: true,
    act: null, aria: "Trip complete", hint: "Paid with Apple Pay · receipt sent",
  },
  thanks: {
    status: "Arrived", lines: TRIP, glyph: "check",
    label: "Thanks!", size: 66, caption: "see you next time", panel: "wide",
    act: null, aria: "Thanks for riding", hint: "Paid with Apple Pay · receipt sent",
  },
};

const PANEL = {
  wide: { left: "3.2%", right: "3.2%" },
  compact: { left: "19%", right: "19%" },
};

const STAR_PATH = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";

type Controls = { stop: () => void };

/* -------------------------------------------------------------- component -- */

/**
 * A taxi-hailing widget. One tap runs the whole ride: hail, a driver is found,
 * the cab arrives, the ride counts down, and you rate it.
 *
 * The glyph in the corner morphs between a waving person, the cab and a
 * check, point for point. The dark panel's outline morphs between states, and
 * gooey blobs burst off its top edge at every milestone — the SVG filter
 * behind that is only switched on while they are moving, since it is by far
 * the most expensive thing on the card to paint.
 */
export default function Taxi({
  width = 300,
  sound = true,
  soundBase = "/sounds/taxi",
  theme = "light",
  onRate,
}: TaxiProps) {
  const gooId = `ptaxi-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const cardRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const pinRingRef = useRef<HTMLSpanElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const gooRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackFillRef = useRef<HTMLDivElement>(null);
  const trackCarRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const starsCaptionRef = useRef<HTMLSpanElement>(null);

  /* read at play time, so the prop can change without rebuilding the ride */
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const onRateRef = useRef(onRate);
  onRateRef.current = onRate;
  const muteRef = useRef<(muted: boolean) => void>(() => {});
  useEffect(() => muteRef.current(!sound), [sound]);

  useEffect(() => {
    const card = cardRef.current!;
    const panel = panelRef.current!;
    const action = actionRef.current!;
    const label = labelRef.current!;
    const caption = captionRef.current!;
    const status = statusRef.current!;
    const hint = hintRef.current!;
    const icon = iconRef.current!;
    const shapes = [...icon.querySelectorAll<SVGPathElement>(".ptaxi__shape")];
    const pinRing = pinRingRef.current!;
    const lines = [...addressRef.current!.querySelectorAll<HTMLDivElement>(".ptaxi__line")];
    const blobs = [...panel.querySelectorAll<HTMLSpanElement>(".ptaxi__blob")];
    const gooLayer = gooRef.current!;
    const track = trackRef.current!;
    const trackFill = trackFillRef.current!;
    const trackCar = trackCarRef.current!;
    const starsBox = starsRef.current!;
    const stars = [...starsBox.querySelectorAll<HTMLButtonElement>(".ptaxi__star")];
    const starsCaption = starsCaptionRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const G = glyphs();

    let alive = true;
    const cleanups: (() => void)[] = [];

    /* one design unit of the 380-wide grid, in px (the card is scaled by CSS) */
    const U = () => card.offsetWidth / 380;

    /* ── sound: the clips decode up front, and play once a gesture allows it ── */
    const sfx = (() => {
      const buffers: Partial<Record<Cue, AudioBuffer>> = {};
      let ctx: AudioContext | null = null;
      let master: GainNode | null = null;
      let muted = !soundRef.current;
      /* an offline context decodes without an autoplay warning, and every clip is ready by the first tap */
      const Offline =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (Offline) {
        const decoder = new Offline(1, 1, 44100);
        (Object.keys(MIX) as Cue[]).forEach(async (name) => {
          try {
            const res = await fetch(`${soundBase}/${name}.wav`);
            if (!res.ok) return;
            buffers[name] = await decoder.decodeAudioData(await res.arrayBuffer());
          } catch {
            /* a missing clip just stays silent */
          }
        });
      }
      /*
       * Building the audio engine is the most expensive thing this card does
       * on the main thread — about a tenth of a second — and built inside the
       * first tap it froze that tap's own animation; the second ride never
       * paid it. So it is built in idle time once the card is on screen. With
       * no gesture behind the page yet it starts suspended, which browsers
       * allow quietly, and the tap then only has to resume it — a fraction of
       * a millisecond.
       */
      function build() {
        if (ctx) return;
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ctx.destination);
      }
      /* from a gesture — on the document, in the capture phase, so it runs before the press animates */
      function unlock() {
        if (!ctx) build();
        if (ctx?.state === "suspended") void ctx.resume();
      }
      /* before anyone taps; if the page has already seen a gesture, it starts running straight away */
      function warm() {
        if (alive) build();
      }
      function play(name: Cue, { rate = 1, delay = 0, gain = 1 } = {}) {
        if (!ctx || !master || muted || !buffers[name]) return;
        const src = ctx.createBufferSource();
        src.buffer = buffers[name]!;
        src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = MIX[name] * gain;
        src.connect(g).connect(master);
        src.start(ctx.currentTime + delay);
      }
      function setMuted(value: boolean) {
        muted = value;
        if (ctx && master) master.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.02);
      }
      return { unlock, warm, play, setMuted, close: () => void ctx?.close().catch(() => {}) };
    })();
    muteRef.current = sfx.setMuted;
    cleanups.push(sfx.close);

    /*
     * Any gesture on the page counts — the engine is usually ready long before
     * the card is tapped. iOS only unlocks audio on touchend or click, so those
     * count too.
     */
    (["pointerdown", "touchend", "click", "keydown"] as const).forEach((type) => {
      document.addEventListener(type, sfx.unlock, { capture: true, passive: true });
      cleanups.push(() => document.removeEventListener(type, sfx.unlock, { capture: true }));
    });

    /* idle time, so the warm-up never competes with a frame that is being drawn */
    const idles: number[] = [];
    const idle = (fn: () => void) => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
      idles.push(ric ? ric(fn, { timeout: 2000 }) : window.setTimeout(fn, 120));
    };
    cleanups.push(() => {
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      idles.forEach((id) => (cic ? cic(id) : clearTimeout(id)));
    });

    /* ── loops and timers, so every state can cleanly stop the last one ── */
    const loops = new Set<Controls>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const loop = (controls: Controls) => {
      loops.add(controls);
      return controls;
    };
    const stopLoops = () => {
      loops.forEach((c) => c.stop());
      loops.clear();
    };
    const later = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };

    /* ── the glyph: person ↔ taxi ↔ check, morphed point for point ── */
    const N = G.person[0].ring.length / 2;
    let glyph: GlyphName = "person";
    let glyphAnim: ReturnType<typeof animate> | null = null;
    /* the rings on screen now, so a morph can start from anywhere — even halfway through another */
    let current: Float32Array[] = G.person.map((s) => s.ring);

    /* rotate `to` so its points line up with `from`; without it, shapes twist on the way */
    function align(from: Float32Array, to: Float32Array) {
      let best = 0;
      let bestCost = Infinity;
      for (let k = 0; k < N; k++) {
        let cost = 0;
        for (let i = 0; i < N && cost < bestCost; i++) {
          const j = ((i + k) % N) * 2;
          const dx = from[i * 2] - to[j];
          const dy = from[i * 2 + 1] - to[j + 1];
          cost += dx * dx + dy * dy;
        }
        if (cost < bestCost) {
          bestCost = cost;
          best = k;
        }
      }
      const out = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) {
        const j = ((i + best) % N) * 2;
        out[i * 2] = to[j];
        out[i * 2 + 1] = to[j + 1];
      }
      return out;
    }

    const alignCache = new Map<string, Float32Array[]>();
    function targetsFor(name: GlyphName, fromName: GlyphName | null) {
      const key = fromName && `${fromName}>${name}`;
      if (key && alignCache.has(key)) return alignCache.get(key)!;
      const targets = G[name].map((s, i) => align(current[i], s.ring));
      if (key) alignCache.set(key, targets);
      return targets;
    }

    /*
     * Every pairing of glyphs, lined up ahead of time. Lining two outlines up
     * is a few hundred thousand comparisons: nothing once the engine has
     * optimised it, but on the very first ride it ran cold, mid-morph, and
     * that was the stutter on the first hail. One pair per idle slice, in the
     * order a ride meets them, so it is done long before the first tap.
     */
    const RIDE_ORDER: [GlyphName, GlyphName][] = [
      ["person", "wave"], ["wave", "person"], ["person", "taxi"], ["wave", "taxi"],
      ["taxi", "check"], ["check", "person"], ["check", "wave"], ["taxi", "person"],
      ["taxi", "wave"], ["person", "check"], ["wave", "check"], ["check", "taxi"],
    ];
    function warmMorphs() {
      const next = RIDE_ORDER.find(([a, b]) => !alignCache.has(`${a}>${b}`));
      if (!next || !alive) return;
      const [a, b] = next;
      alignCache.set(`${a}>${b}`, G[b].map((s, i) => align(G[a][i].ring, s.ring)));
      /* and the path writer, which every frame of a morph calls five times */
      ringPath(G[b][1].ring);
      idle(warmMorphs);
    }

    function ringPath(a: Float32Array) {
      let d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
      for (let i = 2; i < a.length; i += 2) d += `L${a[i].toFixed(1)} ${a[i + 1].toFixed(1)}`;
      return `${d}Z`;
    }

    function drawGlyph(name: GlyphName) {
      G[name].forEach(({ d, fill }, i) => {
        shapes[i].setAttribute("d", d);
        shapes[i].dataset.tone = fill;
      });
      current = G[name].map((s) => s.ring);
      glyph = name;
    }

    function morphGlyph(name: GlyphName, { duration = 0.75, ease = inOut as unknown }: { duration?: number; ease?: unknown } = {}) {
      const settled = !glyphAnim;
      glyphAnim?.stop();
      const from = current;
      const to = targetsFor(name, settled ? glyph : null);
      const easing = ease as typeof inOut;
      /* the tone changes by attribute; the stylesheet eases the fill across, in either theme */
      G[name].forEach(({ fill }, i) => {
        if (shapes[i].dataset.tone === fill) return;
        shapes[i].style.transitionDuration = `${reduce ? 0 : duration * 0.8}s`;
        shapes[i].dataset.tone = fill;
      });
      glyph = name;
      const frame = from.map(() => new Float32Array(N * 2));
      const anim = animate(0, 1, {
        duration: reduce ? 0 : duration,
        ease: easing,
        onUpdate: (t) => {
          for (let s = 0; s < frame.length; s++) {
            const a = from[s];
            const b = to[s];
            const f = frame[s];
            for (let i = 0; i < f.length; i++) f[i] = a[i] + (b[i] - a[i]) * t;
            shapes[s].setAttribute("d", ringPath(f));
          }
          current = frame;
        },
        onComplete: () => {
          if (glyphAnim !== anim) return;
          glyphAnim = null;
          /* settle on the original, crisp outline */
          G[name].forEach(({ d }, i) => shapes[i].setAttribute("d", d));
          current = G[name].map((s) => s.ring);
        },
      });
      glyphAnim = anim;
      return anim;
    }

    /* ── text: letters roll up and out, and the new ones spring up from below ── */
    function toLetters(el: HTMLElement, text: string) {
      el.textContent = "";
      return [...text].map((ch) => {
        const s = document.createElement("span");
        s.className = "ptaxi__letter";
        s.textContent = ch === " " ? NBSP : ch;
        el.appendChild(s);
        return s;
      });
    }

    const outEase = { duration: reduce ? 0 : 0.16, ease: [0.4, 0, 1, 1] as const };
    const setSize = (el: HTMLElement, size: number) => {
      el.dataset.size = String(size);
      el.style.fontSize = `calc(var(--u) * ${size})`;
    };

    /* the same length ("4 min" → "3 min") only rolls the characters that changed */
    async function rollText(el: HTMLElement, text: string, size?: number) {
      const sameSize = !size || el.dataset.size === String(size);
      if (el.dataset.target === text && sameSize) return;
      el.dataset.target = text;
      const old = [...el.querySelectorAll<HTMLSpanElement>(".ptaxi__letter")];
      const prev = old.map((s) => (s.textContent === NBSP ? " " : s.textContent)).join("");

      if (old.length && sameSize && prev.length === text.length) {
        const changed = old.filter((_, i) => prev[i] !== text[i]);
        if (!changed.length) return;
        await animate(changed, { y: "-100%", opacity: 0 }, outEase);
        if (el.dataset.target !== text) return;
        changed.forEach((s) => {
          const ch = text[old.indexOf(s)];
          s.textContent = ch === " " ? NBSP : ch;
        });
        await animate(changed, { y: ["100%", "0%"], opacity: [0, 1] }, snappy);
        return;
      }

      if (old.length) {
        await animate(old, { y: "-100%", opacity: 0 }, { ...outEase, delay: stagger(0.015) });
        if (el.dataset.target !== text) return;
      }
      if (size) setSize(el, size);
      const fresh = toLetters(el, text);
      if (fresh.length) {
        await animate(fresh, { y: ["100%", "0%"], opacity: [0, 1] }, { ...snappy, delay: stagger(0.025) });
      }
    }

    let linesVersion = 0;
    async function swapLines(texts: string[]) {
      const version = ++linesVersion;
      const changed = lines.filter((l, i) => l.textContent !== texts[i]);
      if (!changed.length) {
        /* the text is already right, but an interrupted swap may have left lines hidden */
        await animate(lines, { y: "0%", opacity: 1 }, snappy);
        return;
      }
      await animate(changed, { y: "-100%", opacity: 0 }, { ...outEase, delay: stagger(0.04) });
      if (version !== linesVersion) return;
      changed.forEach((l) => (l.textContent = texts[lines.indexOf(l)]));
      await animate(changed, { y: ["100%", "0%"], opacity: [0, 1] }, { ...snappy, delay: stagger(0.06) });
    }

    function fadeSwap(el: HTMLElement) {
      let version = 0;
      return async (text: string) => {
        if (el.textContent === text) return;
        const v = ++version;
        await animate(el, { opacity: 0, y: -4 }, { duration: 0.14 });
        if (v !== version) return;
        el.textContent = text;
        if (text) await animate(el, { opacity: [0, 1], y: [4, 0] }, { duration: 0.3, ease: "easeOut" });
      };
    }
    const swapCaption = fadeSwap(caption);
    const swapHint = fadeSwap(hint);

    /* ── the panel and its effects ── */
    const shapePanel = (kind: "wide" | "compact") => animate(panel, PANEL[kind], smooth);

    /* the SVG blur is the most expensive paint here, so it is only on while blobs move */
    let gooHeld = false;
    let gooTimer: ReturnType<typeof setTimeout> | undefined;
    let gooEnd = 0;
    function gooOn(ms: number) {
      gooLayer.style.filter = `url(#${gooId})`;
      gooEnd = Math.max(gooEnd, performance.now() + ms);
      clearTimeout(gooTimer);
      gooTimer = setTimeout(() => {
        if (!gooHeld) gooLayer.style.filter = "none";
      }, gooEnd - performance.now());
    }
    cleanups.push(() => clearTimeout(gooTimer));

    function gooBurst() {
      if (reduce) return;
      gooOn(1400);
      const u = U();
      const spread = [-70, -34, 0, 36, 72];
      blobs.forEach((b, i) => {
        const x = (spread[i] + (Math.random() * 16 - 8)) * u;
        const rise = -(40 + Math.random() * 36) * u;
        animate(
          b,
          { x: [0, x * 0.6, x], y: [0, rise, 0], scale: [1, 1.15, 0.6] },
          { duration: 0.9 + i * 0.05, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 },
        );
      });
    }

    /* liquid bumps travelling along the top edge while it searches */
    function gooSearch() {
      if (reduce) return;
      gooHeld = true;
      gooOn(0);
      const u = U();
      blobs.forEach((b, i) => {
        const dir = i % 2 ? 1 : -1;
        loop(
          animate(
            b,
            { x: [0, 60 * dir * u, -60 * dir * u, 0], y: [0, -16 * u, -16 * u, 0], scale: [1, 0.9, 0.9, 1] },
            { duration: 2 + i * 0.35, ease: "easeInOut", repeat: Infinity, delay: i * 0.18 },
          ),
        );
      });
    }

    function settleBlobs() {
      if (gooHeld) {
        gooHeld = false;
        gooOn(700);
      }
      animate(blobs, { x: 0, y: 0, scale: 1 }, smooth);
    }

    function pinPulse() {
      const ping = () => {
        sfx.play("ping");
        later(1200, ping);
      };
      ping();
      loop(animate(pinRing, { scale: [1, 2.1], opacity: [0.55, 0] }, { duration: 1.2, ease: "easeOut", repeat: Infinity }));
    }
    const settlePin = () => animate(pinRing, { opacity: 0, scale: 1 }, { duration: 0.2 });

    /* the wave is a two-pose shape morph, looped until the state changes */
    function waveLoop() {
      const ctl: Controls = { stop() {} };
      loops.add(ctl);
      let up = false;
      const step = () => {
        if (!loops.has(ctl) || !alive) return;
        up = !up;
        morphGlyph(up ? "wave" : "person", { duration: 0.42, ease: "easeInOut" }).then(step);
      };
      step();
    }

    function waveOnce() {
      morphGlyph("wave", { duration: 0.4, ease: "easeInOut" }).then(() => {
        if (alive && glyph === "wave") morphGlyph("person", { duration: 0.45, ease: "easeInOut" });
      });
    }

    function bob(speed: number, lift: number) {
      loop(animate(icon, { y: [0, -lift * U(), 0] }, { duration: speed, ease: "easeInOut", repeat: Infinity }));
    }
    const hop = () => animate(icon, { y: [null, -18 * U(), 0], scaleY: [1, 1.05, 1] }, { duration: 0.5, ease: "easeOut" });
    const settleIcon = () => animate(icon, { y: 0, scaleY: 1 }, smooth);

    const showTrack = (on: boolean) =>
      animate(track, { opacity: on ? 1 : 0, y: on ? 0 : 6 * U() }, { duration: 0.3, ease: "easeOut" });

    function runTrack(seconds: number) {
      loop(animate(trackFill, { scaleX: [0, 1] }, { duration: seconds, ease: "linear" }));
      loop(animate(trackCar, { left: ["0%", "100%"] }, { duration: seconds, ease: "linear" }));
    }

    async function showStars(on: boolean) {
      if (on) {
        stars.forEach((s) => (s.querySelector("path")!.style.fill = "transparent"));
        starsBox.style.display = "flex";
        animate(starsCaption, { opacity: [0, 1], y: [4, 0] }, { duration: 0.3, delay: 0.25, ease: "easeOut" });
        await animate(stars, { opacity: [0, 1], scale: [0.4, 1], y: [10, 0] }, { ...bouncy, delay: stagger(0.05) });
      } else if (starsBox.style.display === "flex") {
        animate(starsCaption, { opacity: 0 }, { duration: 0.15 });
        await animate(stars, { opacity: 0, scale: 0.6 }, { duration: 0.18, delay: stagger(0.03) });
        if (alive) starsBox.style.display = "none";
      }
    }

    /* ── the ride, end to end ── */
    let state: StateName = "idle";
    let busy = false;
    let run = 0;

    async function go(next: StateName) {
      const id = ++run;
      const prev = state;
      const s = STATES[next];
      state = next;
      busy = true;

      clearTimers();
      stopLoops();
      settlePin();
      settleBlobs();
      if (next !== "arrived") settleIcon();

      action.disabled = !s.act;
      action.setAttribute("aria-label", s.aria);
      if (!s.stars) void showStars(false);

      if (s.glyph === "person" && glyph === "wave") morphGlyph("person", { duration: 0.35 });
      else if (s.glyph !== glyph) morphGlyph(s.glyph);

      const work = [
        rollText(status, s.status),
        swapLines(s.lines),
        rollText(label, s.label, s.size),
        swapCaption(s.caption),
        shapePanel(s.panel),
        showTrack(!!s.track),
        swapHint(s.hint),
      ];

      /* the flourishes of each state */
      if (next === "searching") {
        sfx.play("open");
        gooBurst();
        later(350, () => {
          waveLoop();
          pinPulse();
          gooSearch();
        });
      } else if (next === "enroute") {
        sfx.play("found");
        gooBurst();
        runTrack((ENROUTE_STEPS.length * ENROUTE_MS) / 1000);
        later(700, () => bob(0.8, 4));
      } else if (next === "arrived") {
        sfx.play("horn");
        gooBurst();
        hop();
        animate(card, { scale: [1, 1.025, 1] }, { duration: 0.5, ease: "easeOut" });
      } else if (next === "riding") {
        sfx.play("door");
        sfx.play("engine", { delay: 0.32 });
        runTrack((RIDE_STEPS.length * RIDE_MS) / 1000);
        later(600, () => bob(0.45, 3));
      } else if (next === "done") {
        sfx.play("done");
        gooBurst();
        later(350, () => void showStars(true));
      } else if (next === "thanks") {
        sfx.play("thanks", { delay: 0.1 });
      } else if (next === "idle" && prev !== "idle") {
        if (prev === "searching" || prev === "enroute") sfx.play("cancel");
        later(600, waveOnce);
      }

      /* a stalled or interrupted animation must never keep the widget locked */
      await Promise.race([Promise.all(work), new Promise((r) => setTimeout(r, 900))]);
      if (run !== id || !alive) return;
      busy = false;

      /* what happens next on its own */
      if (next === "searching") later(2400, () => void go("enroute"));
      if (next === "enroute") countdown(ENROUTE_STEPS, ENROUTE_MS, () => void go("arrived"));
      if (next === "riding") countdown(RIDE_STEPS, RIDE_MS, () => void go("done"));
      if (next === "thanks") later(2200, () => void go("idle"));
    }

    /* measured from when the state settled, so the track finishes just ahead of the last step */
    function countdown(steps: number[], ms: number, done: () => void) {
      const gain = state === "riding" ? 0.6 : 1;
      steps.slice(1).forEach((n, i) =>
        later(ms * (i + 1) - 300, () => {
          sfx.play("tick", { gain });
          void rollText(label, `${n} min`);
        }),
      );
      later(ms * steps.length - 500, done);
    }

    /* ── input ── */
    const onAction = () => {
      if (busy) return;
      const act = STATES[state].act;
      if (act === "request") void go("searching");
      else if (act === "cancel") void go("idle");
      else if (act === "board") void go("riding");
    };
    action.addEventListener("click", onAction);
    cleanups.push(() => action.removeEventListener("click", onAction));

    cleanups.push(
      press(action, () => {
        if (busy || !STATES[state].act) return;
        sfx.unlock();
        sfx.play("tap");
        animate(panel, { scale: 0.96 }, snappy);
        return () => animate(panel, { scale: 1 }, bouncy);
      }),
    );

    stars.forEach((star) => {
      star.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}" fill="transparent" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
      const onStar = () => {
        if (state !== "done" || busy) return;
        busy = true;
        const n = Number(star.dataset.n);
        const picked = stars.slice(0, n);
        picked.forEach((s, i) => {
          s.querySelector("path")!.style.fill = "currentColor";
          sfx.play("star", { delay: i * 0.05, rate: 1 + i * 0.09 });
        });
        animate(picked, { scale: [1, 1.3, 1] }, { duration: 0.4, delay: stagger(0.05), ease: "easeOut" });
        onRateRef.current?.(n);
        later(700, () => state === "done" && void go("thanks"));
      };
      star.addEventListener("click", onStar);
      cleanups.push(() => star.removeEventListener("click", onStar));
    });

    /* ── the entrance ── */
    drawGlyph("person");
    setSize(label, 76);
    toLetters(label, "Taxi!");
    toLetters(status, "Currently:");
    label.dataset.target = "Taxi!";
    status.dataset.target = "Currently:";

    const reveals = [...card.querySelectorAll<HTMLElement>(".ptaxi__reveal")];
    /*
     * The first time the browser draws the goo — a blur, a colour matrix and
     * a composite, over blobs flying out of the panel — it has to build GPU
     * programs for it, and that stalled the first hail for a few frames;
     * every ride after was smooth. The programs depend on the goo being drawn
     * exactly as a ride draws it — in the card, at full strength, with blobs
     * leaving the panel — so a faint or detached stand-in builds the wrong
     * ones. So once the entrance has settled, a copy of the panel's goo runs
     * one real burst behind the panel, in the card's own colour: its base is
     * hidden under the panel, and its blobs fly out over a card of exactly
     * their colour. Nothing on screen changes, and the first hail finds the
     * programs already built.
     */
    function rehearseGoo() {
      if (reduce || !alive || state !== "idle") return;
      const ghost = gooLayer.cloneNode(true) as HTMLSpanElement;
      ghost.style.setProperty("--panel", "var(--card)");
      ghost.style.filter = `url(#${gooId})`;
      ghost.setAttribute("aria-hidden", "true");
      panel.prepend(ghost);
      const u = U();
      const spread = [-70, -34, 0, 36, 72];
      const flights = [...ghost.querySelectorAll<HTMLSpanElement>(".ptaxi__blob")].map((b, i) =>
        animate(
          b,
          { x: [0, spread[i] * 0.6 * u, spread[i] * u], y: [0, -58 * u, 0], scale: [1, 1.15, 0.6] },
          { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 },
        ),
      );
      void Promise.all(flights).then(() => ghost.remove());
      cleanups.push(() => ghost.remove());
    }

    function enter() {
      if (!alive) return;
      animate(card, { opacity: [0, 1], scale: [0.94, 1], y: [16, 0] }, { type: "spring", stiffness: 220, damping: 24 });
      animate(reveals, { opacity: [0, 1], y: [14, 0] }, { ...snappy, delay: stagger(0.07, { startDelay: 0.15 }) });
      animate(icon, { opacity: [0, 1], y: [28, 0] }, { ...smooth, delay: 0.28 }).then(() => {
        if (alive && state === "idle") waveOnce();
      });
      animate(panel, { opacity: [0, 1], y: [36, 0], scale: [0.94, 1] }, { ...smooth, delay: 0.34 });
      animate(
        label.querySelectorAll(".ptaxi__letter"),
        { y: ["100%", "0%"], opacity: [0, 1] },
        { ...bouncy, delay: stagger(0.05, { startDelay: 0.5 }) },
      );
      animate(hint, { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, delay: 0.9 });
    }

    /*
     * The entrance ends on a wave, so the two morphs it uses are lined up now,
     * while the face loads and nothing is moving yet. The rest of a ride's
     * morphs, and the audio engine where a gesture already allows it, follow
     * in idle time once the card is on screen.
     */
    for (const [a, b] of RIDE_ORDER.slice(0, 2)) {
      alignCache.set(`${a}>${b}`, G[b].map((s, i) => align(G[a][i].ring, s.ring)));
    }

    /* start once the face is ready, so nothing reflows mid-animation — capped, so a slow font never holds it back */
    let raf = 0;
    void Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(() => {
      if (!alive) return;
      raf = requestAnimationFrame(enter);
      idle(sfx.warm);
      idle(warmMorphs);
      const rehearsal = window.setTimeout(rehearseGoo, 1500);
      cleanups.push(() => clearTimeout(rehearsal));
    });


    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimers();
      stopLoops();
      glyphAnim?.stop();
      cleanups.forEach((fn) => fn());
      muteRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundBase, gooId]);

  return (
    <div className="ptaxi" data-theme={theme} style={{ "--ptaxi-w": `${width}px` } as React.CSSProperties}>
      {/* the gooey filter, only switched on while blobs are moving */}
      <svg width="0" height="0" className="ptaxi__defs" aria-hidden="true">
        <defs>
          <filter id={gooId} x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="ptaxi__hold">
        <section ref={cardRef} className="ptaxi__card ptaxi__pre" aria-label="Taxi">
          {/* the status and three lines of detail */}
          <div className="ptaxi__info">
            <div className="ptaxi__reveal ptaxi__pre ptaxi__statusRow">
              <span className="ptaxi__pin">
                <span ref={pinRingRef} className="ptaxi__pinRing" />
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="currentColor" />
                  <path className="ptaxi__pinArrow" d="M17.2 6.8 7 11.1l4.4 1.4 1.4 4.4z" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="ptaxi__statusClip">
                <span ref={statusRef} className="ptaxi__status" aria-live="polite">
                  Currently:
                </span>
              </span>
            </div>

            <div ref={addressRef} className="ptaxi__address" aria-live="polite">
              {HOME.map((line) => (
                <div className="ptaxi__lineClip" key={line}>
                  <div className="ptaxi__reveal ptaxi__pre ptaxi__line">{line}</div>
                </div>
              ))}
            </div>
          </div>

          {/* the morphing glyph: person ↔ taxi ↔ check */}
          <svg ref={iconRef} className="ptaxi__icon ptaxi__pre" viewBox="0 0 250 500" aria-hidden="true">
            <path className="ptaxi__shape" />
            <path className="ptaxi__shape" />
            <path className="ptaxi__shape" />
            <path className="ptaxi__shape" />
            <path className="ptaxi__shape" />
          </svg>

          {/* the action panel, whose outline morphs between states */}
          <div ref={panelRef} className="ptaxi__panel ptaxi__pre" style={{ left: "3.2%", right: "3.2%" }}>
            <span ref={gooRef} className="ptaxi__goo">
              <span className="ptaxi__gooBase" />
              {[36, 28, 32, 24, 20].map((s, i) => (
                <span className="ptaxi__blob" key={i} style={{ "--s": s } as React.CSSProperties} />
              ))}
            </span>
            <span className="ptaxi__panelEdge" />

            <button ref={actionRef} type="button" className="ptaxi__action" aria-label="Request a taxi">
              <span className="ptaxi__labelClip">
                <span ref={labelRef} className="ptaxi__label">
                  Taxi!
                </span>
              </span>
              <span ref={captionRef} className="ptaxi__caption" />
            </button>

            {/* the rating: its own centred block, so the row and caption never collide */}
            <div ref={starsRef} className="ptaxi__stars" role="group" aria-label="Rate your ride">
              <div className="ptaxi__starRow">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    className="ptaxi__star"
                    key={n}
                    data-n={n}
                    aria-label={n === 1 ? "1 star" : `${n} stars`}
                  />
                ))}
              </div>
              <span ref={starsCaptionRef} className="ptaxi__starsCaption">
                rate your ride
              </span>
            </div>

            {/* the trip's progress */}
            <div ref={trackRef} className="ptaxi__track">
              <div ref={trackFillRef} className="ptaxi__trackFill" />
              <div className="ptaxi__trackEnd" />
              <div ref={trackCarRef} className="ptaxi__trackCar" />
            </div>
          </div>
        </section>

        {/* hangs under the card without pushing it off centre */}
        <p ref={hintRef} className="ptaxi__hint ptaxi__pre">
          Tap Taxi! to start a ride
        </p>
      </div>
    </div>
  );
}
