"use client";

import { useEffect, useRef } from "react";
import { animate, motionValue, stagger } from "motion/react";
import "./progress-image.css";

/**
 * Progress Image — a rollout card whose photograph is the progress bar.
 *
 * The percentage on the slider is how far the picture has resolved, so a 25%
 * rollout is a quarter-built image and 100% is the whole photograph. The bar
 * under the card picks the look of that resolve: a pixel quadtree, fog that
 * clears in patches, a pencil sketch coloured in from the shadows, a halftone
 * print, a grain dissolve, or ink bleeding across paper. Every look is a pure
 * function of the value, so it scrubs smoothly both ways under a drag.
 *
 * The presets share one liquid indicator — a fast lead blob and a lagging
 * trail under a goo filter, which stretch into one drop on the way and merge
 * when the trail catches up. The slider tracks the pointer 1:1, settles on a
 * whole number (or a preset when it lands within two of one), and is a full
 * keyboard slider: arrows, Shift for tens, Page Up and Down, Home and End.
 */

export type RevealFx = "pixel" | "fog" | "sketch" | "halftone" | "dissolve" | "ink";

export type ProgressImageProps = {
  theme?: "light" | "dark";
  /** The photograph. It must be served with CORS headers for any look but Pixel. */
  src?: string;
  alt?: string;
  /** Where the rollout lands once the photograph has loaded. */
  defaultValue?: number;
  /** The look the photograph resolves in. */
  defaultTransition?: RevealFx;
  /** Fired with the committed whole-number percentage whenever it changes. */
  onChange?: (value: number) => void;
};

const PRESETS = [0, 25, 50, 75, 90, 100];
export const REVEAL_FX: { id: RevealFx; label: string }[] = [
  { id: "pixel", label: "Pixel" },
  { id: "fog", label: "Fog" },
  { id: "sketch", label: "Sketch" },
  { id: "halftone", label: "Halftone" },
  { id: "dissolve", label: "Dissolve" },
  { id: "ink", label: "Ink" },
];
const SRC = "https://picsum.photos/id/1015/1200/620";

const clamp = (n: number, a = 0, b = 100) => Math.min(b, Math.max(a, n));

/* Deterministic random, so every pattern is identical on every load. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

type Blend = {
  from: Uint8ClampedArray;
  T: Uint8Array;
  soft: number;
  edge?: number;
  ink?: [number, number, number];
};
type Tile = { x: number; y: number; level: number; thr: number; kids: Tile[] | null };

/* tile sizes in CSS px; the level after 6px is full detail */
const SIZES = [48, 24, 12, 6];
/* the progress window each level splits in */
const RANGES = [
  [0, 0.18],
  [0.1, 0.36],
  [0.24, 0.52],
  [0.38, 0.68],
  [0.52, 0.9],
];
/* progress span of each split's crossfade */
const FADE = 0.05;

/**
 * The resolve itself, drawn onto `photo` from `img`. Exported so a video edit
 * can drive the same pixels from its own clock: `draw(p, fx)` paints progress
 * `p` (0–1) synchronously and depends on nothing else.
 *
 * • Pixel is a quadtree: 48px tiles split into four sharper tiles (24 → 12 →
 *   6px) and then full detail, each at its own seeded threshold, crossfading
 *   into its children.
 * • Every other look is a per-pixel reveal: a "from" image (fog, a pencil
 *   sketch, a halftone print…) plus a threshold map deciding when each pixel
 *   becomes the photograph, blended in one pass through a 256-entry table.
 */
export function createRevealEngine(photo: HTMLCanvasElement, img: HTMLImageElement) {
  const pctx = photo.getContext("2d", { willReadFrequently: true })!;
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let PW = 0;
  let PH = 0;
  let full: HTMLCanvasElement | null = null;
  let levels: HTMLCanvasElement[] = [];
  let roots: Tile[] = [];
  let photoPx: Uint8ClampedArray | null = null;
  let lum: Uint8Array | null = null;
  let outImg: ImageData | null = null;
  const cache = new Map<RevealFx, Blend>();

  /* ----- Pixel: quadtree ----- */
  function buildPixel() {
    // One pixel per tile: downsample once per level, then each tile is a 1×1 blit.
    levels = SIZES.map((s) => {
      const c = canvas(Math.ceil(cssW / s), Math.ceil(cssH / s));
      const x = c.getContext("2d")!;
      x.imageSmoothingQuality = "high";
      // Exact mapping (the last row and column are only partly covered), over a
      // stretched copy so those partial edge tiles stay opaque.
      x.drawImage(img, 0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, cssW / s, cssH / s);
      return c;
    });
    const rand = rng(1015);
    const node = (x: number, y: number, level: number, parentThr: number): Tile => {
      const [a, b] = RANGES[level];
      const s = SIZES[Math.min(level, SIZES.length - 1)];
      // Distance from centre (0 middle → 1 corner) nudges outer tiles later.
      const d = Math.hypot((x + s / 2) / cssW - 0.5, (y + s / 2) / cssH - 0.5) / 0.7071;
      const u = 0.7 * rand() + 0.3 * Math.min(1, d);
      return { x, y, level, thr: Math.max(a + (b - a) * u, parentThr + FADE * 0.6), kids: null };
    };
    const split = (n: Tile) => {
      if (n.level >= SIZES.length) return;
      const s = SIZES[n.level] / 2;
      const L = n.level + 1;
      n.kids = [];
      for (const [ox, oy] of [
        [0, 0],
        [s, 0],
        [0, s],
        [s, s],
      ]) {
        if (n.x + ox >= cssW || n.y + oy >= cssH) continue;
        const k = node(n.x + ox, n.y + oy, L, n.thr);
        split(k);
        n.kids.push(k);
      }
    };
    roots = [];
    for (let y = 0; y < cssH; y += SIZES[0]) {
      for (let x = 0; x < cssW; x += SIZES[0]) {
        const r = node(x, y, 0, -1);
        split(r);
        roots.push(r);
      }
    }
  }
  // Snap tile edges to device pixels so neighbouring tiles never leave seams.
  const px = (v: number) => Math.round(v * dpr);
  function drawTile(n: Tile) {
    const dx = px(n.x);
    const dy = px(n.y);
    const s = SIZES[Math.min(n.level, SIZES.length - 1)];
    const dw = px(Math.min(n.x + s, cssW)) - dx;
    const dh = px(Math.min(n.y + s, cssH)) - dy;
    if (n.level >= SIZES.length) pctx.drawImage(full!, dx, dy, dw, dh, dx, dy, dw, dh);
    else pctx.drawImage(levels[n.level], n.x / s, n.y / s, 1, 1, dx, dy, dw, dh);
  }
  function drawNode(n: Tile, p: number, alpha: number) {
    if (!n.kids || p < n.thr) {
      pctx.globalAlpha = alpha;
      drawTile(n);
      return;
    }
    const k = (p - n.thr) / FADE;
    if (k < 1) {
      pctx.globalAlpha = alpha;
      drawTile(n);
    }
    // Children fade in over their parent; once fully in, the parent is skipped.
    const a = alpha * Math.min(1, k);
    for (const c of n.kids) drawNode(c, p, a);
  }

  /* ----- Per-pixel reveals ----- */

  // Smooth multi-octave value noise, made by letting the canvas bilinearly
  // upscale tiny random grids, contrast-stretched to 0..255.
  function fbm(seed: number, octaves: [number, number, number][]) {
    const rand = rng(seed);
    const c = canvas(PW, PH);
    const x = c.getContext("2d", { willReadFrequently: true })!;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    octaves.forEach(([gw, gh, alpha], i) => {
      const g = canvas(gw, gh);
      const gx = g.getContext("2d")!;
      const d = gx.createImageData(gw, gh);
      for (let k = 0; k < gw * gh; k++) {
        const v = (rand() * 255) | 0;
        d.data.set([v, v, v, 255], k * 4);
      }
      gx.putImageData(d, 0, 0);
      x.globalAlpha = i === 0 ? 1 : alpha;
      x.drawImage(g, 0, 0, PW, PH);
    });
    const src = x.getImageData(0, 0, PW, PH).data;
    const out = new Uint8Array(PW * PH);
    let lo = 255;
    let hi = 0;
    for (let i = 0; i < out.length; i++) {
      const v = src[i * 4];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const k = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < out.length; i++) out[i] = (src[i * 4] - lo) * k;
    return out;
  }
  const mixT = (a: Uint8Array, b: Uint8Array, wb: number) => {
    const o = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) o[i] = a[i] * (1 - wb) + b[i] * wb;
    return o;
  };
  const solid = (r: number, g: number, b: number) => {
    const o = new Uint8ClampedArray(PW * PH * 4);
    for (let i = 0; i < PW * PH; i++) o.set([r, g, b, 255], i * 4);
    return o;
  };

  const builders: Record<Exclude<RevealFx, "pixel">, () => Blend> = {
    // Haze that clears in soft drifting patches.
    fog() {
      const a = canvas(Math.max(2, PW >> 4), Math.max(2, PH >> 4));
      const b = canvas(Math.max(2, PW >> 5), Math.max(2, PH >> 5));
      a.getContext("2d")!.drawImage(full!, 0, 0, a.width, a.height);
      b.getContext("2d")!.drawImage(a, 0, 0, b.width, b.height);
      const c = canvas(PW, PH);
      const cx = c.getContext("2d", { willReadFrequently: true })!;
      cx.imageSmoothingQuality = "high";
      cx.drawImage(b, 0, 0, PW, PH);
      const from = cx.getImageData(0, 0, PW, PH).data;
      for (let i = 0; i < from.length; i += 4) {
        const g = from[i] * 0.3 + from[i + 1] * 0.59 + from[i + 2] * 0.11;
        from[i] = (g * 0.5 + from[i] * 0.5) * 0.45 + 232 * 0.55;
        from[i + 1] = (g * 0.5 + from[i + 1] * 0.5) * 0.45 + 236 * 0.55;
        from[i + 2] = (g * 0.5 + from[i + 2] * 0.5) * 0.45 + 241 * 0.55;
      }
      return { from, T: fbm(11, [[6, 3, 1], [12, 6, 0.5], [26, 13, 0.3]]), soft: 0.24 };
    },
    // Pencil drawing on paper; colour paints in from the shadows up.
    sketch() {
      const L = lum!;
      const from = new Uint8ClampedArray(PW * PH * 4);
      const rand = rng(7);
      const at = (x: number, y: number) => L[Math.min(PH - 1, Math.max(0, y)) * PW + Math.min(PW - 1, Math.max(0, x))];
      for (let y = 0; y < PH; y++) {
        for (let x = 0; x < PW; x++) {
          const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
          const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
          const edge = Math.min(255, (Math.abs(gx) + Math.abs(gy)) * 0.38);
          const shade = 255 - (255 - at(x, y)) * 0.28;
          const v = Math.min(255 - edge, shade) - rand() * 10;
          const i = (y * PW + x) * 4;
          from[i] = (247 * v) / 255;
          from[i + 1] = (244 * v) / 255;
          from[i + 2] = (237 * v) / 255;
          from[i + 3] = 255;
        }
      }
      return { from, T: mixT(L, fbm(17, [[10, 5, 1], [30, 15, 0.4]]), 0.4), soft: 0.14 };
    },
    // Print-style ink dots, resolving outward from the centre.
    halftone() {
      const cell = Math.max(4, Math.round(6 * dpr));
      const sw = Math.ceil(PW / cell) + 1;
      const sh = Math.ceil(PH / cell) + 1;
      const s = canvas(sw, sh);
      const sx = s.getContext("2d", { willReadFrequently: true })!;
      sx.drawImage(full!, 0, 0, sw * cell, sh * cell, 0, 0, sw, sh);
      const avg = sx.getImageData(0, 0, sw, sh).data;
      const c = canvas(PW, PH);
      const cx = c.getContext("2d", { willReadFrequently: true })!;
      cx.fillStyle = "#f6f3ec";
      cx.fillRect(0, 0, PW, PH);
      cx.fillStyle = "#1f2c4a";
      for (let gy = 0; gy < sh; gy++) {
        for (let gx = 0; gx < sw; gx++) {
          const i = (gy * sw + gx) * 4;
          const l = (avg[i] * 0.3 + avg[i + 1] * 0.59 + avg[i + 2] * 0.11) / 255;
          const r = cell * 0.6 * Math.sqrt(1 - l);
          if (r < 0.4) continue;
          // Alternate rows offset by half a cell for a diagonal screen.
          cx.beginPath();
          cx.arc(gx * cell + (gy % 2 ? cell / 2 : 0), gy * cell + cell / 2, r, 0, Math.PI * 2);
          cx.fill();
        }
      }
      const radial = new Uint8Array(PW * PH);
      for (let y = 0; y < PH; y++) {
        for (let x = 0; x < PW; x++) {
          radial[y * PW + x] = Math.min(255, (Math.hypot(x / PW - 0.5, (y / PH - 0.5) * (PH / PW)) / 0.56) * 255);
        }
      }
      return { from: cx.getImageData(0, 0, PW, PH).data, T: mixT(radial, fbm(23, [[14, 7, 1]]), 0.3), soft: 0.1 };
    },
    // Random 2px grains snap in one by one.
    dissolve() {
      const L = lum!;
      const from = new Uint8ClampedArray(PW * PH * 4);
      for (let i = 0; i < PW * PH; i++) {
        const g = L[i] * 0.55 + 30;
        from.set([g * 0.92, g * 0.96, g * 1.06, 255], i * 4);
      }
      const b = Math.max(1, Math.round(2 * dpr));
      const rand = rng(31);
      const T = new Uint8Array(PW * PH);
      const bw = Math.ceil(PW / b);
      const cells = new Uint8Array(bw * Math.ceil(PH / b));
      for (let i = 0; i < cells.length; i++) cells[i] = rand() * 255;
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) T[y * PW + x] = cells[((y / b) | 0) * bw + ((x / b) | 0)];
      return { from, T, soft: 0.03 };
    },
    // Ink blots bleed across paper, with a dark wet edge on the spreading front.
    ink() {
      return {
        from: solid(246, 243, 236),
        T: fbm(41, [[7, 4, 1], [18, 9, 0.5], [44, 22, 0.28], [96, 48, 0.14]]),
        soft: 0.05,
        edge: 0.7,
        ink: [24, 34, 62],
      };
    },
  };

  function ensure(id: RevealFx) {
    if (id === "pixel" || cache.has(id) || !photoPx) return;
    try {
      cache.set(id, builders[id]());
    } catch (err) {
      console.warn(`Transition "${id}" unavailable`, err);
    }
  }

  // One blend pass: each pixel's alpha comes from its threshold through a LUT.
  const lut = new Uint8Array(256);
  const edgeLut = new Uint8Array(256);
  function drawBlend(c: Blend, p: number) {
    const s = c.soft;
    const q = p * (1 + s);
    for (let t = 0; t < 256; t++) {
      let a = (q - t / 255) / s;
      a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
      lut[t] = a * 255;
      edgeLut[t] = c.edge ? 4 * a * (1 - a) * c.edge * 255 : 0;
    }
    const out = outImg!.data;
    const from = c.from;
    const T = c.T;
    const ink = c.ink;
    const ph = photoPx!;
    for (let i = 0, o = 0; i < T.length; i++, o += 4) {
      const a = lut[T[i]];
      if (a === 0) {
        out[o] = from[o];
        out[o + 1] = from[o + 1];
        out[o + 2] = from[o + 2];
      } else if (a === 255) {
        out[o] = ph[o];
        out[o + 1] = ph[o + 1];
        out[o + 2] = ph[o + 2];
      } else {
        const k = a / 255;
        out[o] = from[o] + (ph[o] - from[o]) * k;
        out[o + 1] = from[o + 1] + (ph[o + 1] - from[o + 1]) * k;
        out[o + 2] = from[o + 2] + (ph[o + 2] - from[o + 2]) * k;
        const e = edgeLut[T[i]];
        if (e && ink) {
          const m = e / 255;
          out[o] += (ink[0] - out[o]) * m;
          out[o + 1] += (ink[1] - out[o + 1]) * m;
          out[o + 2] += (ink[2] - out[o + 2]) * m;
        }
      }
      out[o + 3] = 255;
    }
    pctx.putImageData(outImg!, 0, 0);
  }

  return {
    /** Size the buffers to the canvas's box; false while it has no size. */
    build(pixelRatio = Math.min(2, devicePixelRatio || 1)) {
      dpr = pixelRatio;
      cssW = photo.clientWidth;
      cssH = photo.clientHeight;
      if (!cssW || !cssH) return false;
      PW = photo.width = Math.round(cssW * dpr);
      PH = photo.height = Math.round(cssH * dpr);
      full = canvas(PW, PH);
      const f = full.getContext("2d", { willReadFrequently: true })!;
      f.imageSmoothingQuality = "high";
      f.drawImage(img, 0, 0, PW, PH);
      buildPixel();
      cache.clear();
      try {
        photoPx = f.getImageData(0, 0, PW, PH).data;
        lum = new Uint8Array(PW * PH);
        for (let i = 0; i < lum.length; i++) lum[i] = photoPx[i * 4] * 0.3 + photoPx[i * 4 + 1] * 0.59 + photoPx[i * 4 + 2] * 0.11;
        outImg = pctx.createImageData(PW, PH);
      } catch {
        // Pixels unreadable (no CORS): only Pixel is available.
        photoPx = null;
      }
      return true;
    },
    ensure,
    /** Builds the looks not yet cached, one per idle slot, so switching is instant. */
    prewarm(): () => void {
      let stopped = false;
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 60));
      const next = () => {
        if (stopped) return;
        const id = REVEAL_FX.map((f) => f.id).find((f) => f !== "pixel" && !cache.has(f));
        if (!id || !photoPx) return;
        ensure(id);
        if (cache.has(id)) idle(next);
      };
      idle(next);
      return () => {
        stopped = true;
      };
    },
    draw(p: number, fx: RevealFx) {
      pctx.globalAlpha = 1;
      pctx.imageSmoothingEnabled = false;
      const c = fx === "pixel" ? undefined : (ensure(fx), cache.get(fx));
      if (p >= 0.999) pctx.drawImage(full!, 0, 0);
      else if (c) drawBlend(c, p);
      else for (const r of roots) drawNode(r, p, 1);
      pctx.globalAlpha = 1;
    },
    get size() {
      return `${cssW}x${cssH}`;
    },
  };
}

export default function ProgressImage({
  theme = "light",
  src = SRC,
  alt = "A deep blue fjord winding between rocky cliffs",
  defaultValue = 75,
  defaultTransition = "pixel",
  onChange,
}: ProgressImageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  /* read through a ref so a new callback each render does not rebuild the card */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const S = (stiffness: number, damping: number, mass = 1) =>
      reduce ? { duration: 0 } : { type: "spring" as const, stiffness, damping, mass };

    const cleanups: (() => void)[] = [];
    const on = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
    ) => {
      el.addEventListener(type, fn);
      cleanups.push(() => el.removeEventListener(type, fn));
    };
    const observe = (el: Element, fn: () => void) => {
      const ro = new ResizeObserver(fn);
      ro.observe(el);
      cleanups.push(() => ro.disconnect());
    };
    let alive = true;

    /* ---------- Preset pills ---------- */
    const pills = Array.from(root.querySelectorAll<HTMLButtonElement>(".ppimg__pill"));
    const leadEl = q<HTMLDivElement>(".ppimg__blob--lead");
    const trailEl = q<HTMLDivElement>(".ppimg__blob--trail");

    // Two blobs: the lead snaps quickly, the trail lags; under the goo filter
    // they stretch into one liquid drop and merge again when the trail lands.
    const lead = { x: motionValue(0), w: motionValue(60), o: motionValue(0) };
    const trail = { x: motionValue(0), w: motionValue(60), o: motionValue(0) };
    let pillTop = 0;
    const bind = (el: HTMLElement, m: typeof lead) => {
      const paint = () => {
        el.style.left = `${m.x.get()}px`;
        el.style.top = `${pillTop}px`;
        el.style.width = `${m.w.get()}px`;
        el.style.opacity = String(m.o.get());
      };
      cleanups.push(m.x.on("change", paint), m.w.on("change", paint), m.o.on("change", paint));
      return paint;
    };
    const paintLead = bind(leadEl, lead);
    const paintTrail = bind(trailEl, trail);

    let activePreset = -1;
    function moveIndicator(index: number, instant = false) {
      const prev = activePreset;
      activePreset = index;
      pills.forEach((p, i) => {
        p.setAttribute("aria-checked", String(i === index));
        p.tabIndex = i === index || (index === -1 && i === 0) ? 0 : -1;
      });
      if (index === -1) {
        animate(lead.o, 0, { duration: 0.18 });
        animate(trail.o, 0, { duration: 0.18 });
        return;
      }
      const p = pills[index];
      pillTop = p.offsetTop;
      const x = p.offsetLeft;
      const w = p.offsetWidth;
      if (instant || prev === -1) {
        // Appear in place with a soft pop rather than sliding from nowhere.
        [lead, trail].forEach((m) => {
          m.x.jump(x);
          m.w.jump(w);
        });
        paintLead();
        paintTrail();
        if (instant) {
          lead.o.jump(1);
          trail.o.jump(1);
          paintLead();
          paintTrail();
          return;
        }
        animate(lead.o, 1, { duration: reduce ? 0 : 0.2 });
        animate(trail.o, 1, { duration: reduce ? 0 : 0.2 });
        if (!reduce) animate(leadEl, { scale: [0.85, 1] }, S(500, 22));
        return;
      }
      animate(lead.x, x, S(520, 34));
      animate(lead.w, w, S(520, 34));
      animate(trail.x, x, S(170, 22, 1.1));
      animate(trail.w, w, S(170, 22, 1.1));
      // Squash the travelling drop a little, then let it settle.
      if (!reduce) animate(trailEl, { scaleY: [1, 0.72, 1] }, { duration: 0.45, ease: "easeOut" });
    }

    /* ---------- Photo ---------- */
    const photo = q<HTMLCanvasElement>(".ppimg__photo");
    const shimmer = q<HTMLDivElement>(".ppimg__shimmer");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const engine = createRevealEngine(photo, img);
    let ready = false;
    let fx: RevealFx = REVEAL_FX.some((f) => f.id === defaultTransition) ? defaultTransition : "pixel";
    // Replays the resolve when the look changes; the photo shows value × reveal.
    const reveal = motionValue(1);
    const value = motionValue(0);
    let stopPrewarm = () => {};
    cleanups.push(() => stopPrewarm());

    const build = () => {
      if (!engine.build()) return;
      engine.ensure(fx);
      stopPrewarm();
      stopPrewarm = engine.prewarm();
    };

    let queued = 0;
    cleanups.push(() => cancelAnimationFrame(queued));
    const progress = () => (clamp(value.get()) / 100) * clamp(reveal.get(), 0, 1);
    function paintPhoto() {
      const t = progress();
      // Pixel blooms its colour in with the detail; the other looks carry their own palette.
      photo.style.filter = fx === "pixel" ? `saturate(${(0.35 + 0.65 * Math.pow(t, 0.6)).toFixed(3)})` : "";
      shimmer.style.opacity = String(ready ? clamp(1 - t / 0.3, 0, 1) * 0.6 : 1);
      if (!ready || queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        engine.draw(progress(), fx);
      });
    }
    cleanups.push(reveal.on("change", paintPhoto));

    const imageReady = new Promise<void>((resolve) => {
      img.onload = async () => {
        try {
          await img.decode();
        } catch {}
        if (!alive) return;
        build();
        ready = true;
        paintPhoto();
        animate(photo, { opacity: 1 }, { duration: reduce ? 0 : 0.5, ease: "easeOut" });
        resolve();
      };
      // Keep the skeleton; the card still works.
      img.onerror = () => resolve();
    });
    img.src = src;
    cleanups.push(() => {
      img.onload = null;
      img.onerror = null;
    });
    observe(photo, () => {
      const size = `${photo.clientWidth}x${photo.clientHeight}`;
      if (!ready || size === engine.size) return;
      build();
      paintPhoto();
    });

    /* ---------- Slider ---------- */
    const track = q<HTMLDivElement>(".ppimg__track");
    const fill = q<HTMLDivElement>(".ppimg__fill");
    const pct = q<HTMLSpanElement>(".ppimg__pct");
    const knob = q<HTMLSpanElement>(".ppimg__knob");
    let target = 0;
    /* the track's height: the fill's left end and the knob sit inside it */
    const H = 44;
    let trackW = track.clientWidth;

    let shownPct = -1;
    function paintFill() {
      const v = clamp(value.get());
      // Transform only: the full-width fill slides so its right end sits at x.
      const x = H + (trackW - H) * (v / 100);
      fill.style.transform = `translate3d(${x - trackW}px,0,0)`;
      const r = Math.round(v);
      if (r !== shownPct) {
        shownPct = r;
        pct.textContent = `${r}%`;
      }
      pct.style.opacity = String(clamp((v - 8) / 8, 0, 1));
      paintPhoto();
    }
    cleanups.push(value.on("change", paintFill));
    observe(track, () => {
      trackW = track.clientWidth;
      paintFill();
      if (activePreset >= 0) moveIndicator(activePreset, true);
    });

    // Commit the whole number (aria, preset pill, callback) only when it changes.
    function commit(v: number) {
      const next = Math.round(clamp(v));
      if (next !== target || track.getAttribute("aria-valuenow") !== String(next)) {
        target = next;
        track.setAttribute("aria-valuenow", String(target));
        track.setAttribute("aria-valuetext", `${target}% of users`);
        onChangeRef.current?.(target);
      }
      const idx = PRESETS.indexOf(target);
      if (idx !== activePreset) moveIndicator(idx);
    }
    function setValue(v: number, spring?: Parameters<typeof animate>[2]) {
      commit(v);
      animate(value, target, (spring ?? S(170, 26)) as never);
    }

    pills.forEach((p, i) => {
      on(p, "click", () => setValue(PRESETS[i]));
      on(p, "pointerdown", () => !reduce && animate(p, { scale: 0.94 }, S(600, 30)));
      const up = () => !reduce && animate(p, { scale: 1 }, S(500, 18));
      on(p, "pointerup", up);
      on(p, "pointerleave", up);
      on(p, "keydown", (e) => {
        const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
        if (!d) return;
        e.preventDefault();
        const next = (Math.max(0, activePreset) + d + pills.length) % pills.length;
        setValue(PRESETS[next]);
        pills[next].focus();
      });
    });

    // Dragging is 1:1 — the value jumps straight to the pointer with no spring in
    // the loop. Grabbing the knob keeps the grab offset; pressing the bare track
    // glides there first, then hands over to direct tracking.
    type Drag = { left: number; offset: number; glide: ReturnType<typeof animate> | null };
    let drag: Drag | null = null;
    const valueAtX = (d: Drag, clientX: number) => clamp(((clientX - d.left - d.offset - H / 2) / (trackW - H)) * 100);
    const glideTo = (d: Drag, v: number, spring: ReturnType<typeof S>) => {
      const g = (d.glide = animate(value, v, spring));
      g.then(() => {
        if (drag === d && d.glide === g) d.glide = null;
      });
    };
    on(track, "pointerdown", (e) => {
      if (e.button !== 0) return;
      const r = track.getBoundingClientRect();
      const k = knob.getBoundingClientRect();
      const onKnob = e.clientX >= k.left - 6 && e.clientX <= k.right + 6;
      const d: Drag = { left: r.left, offset: onKnob ? e.clientX - (k.left + k.width / 2) : 0, glide: null };
      drag = d;
      track.setPointerCapture(e.pointerId);
      if (!reduce) animate(knob, { scale: 0.88 }, S(600, 30));
      const v = valueAtX(d, e.clientX);
      commit(v);
      if (onKnob || reduce) value.jump(v);
      else glideTo(d, v, S(520, 42));
    });
    on(track, "pointermove", (e) => {
      const d = drag;
      if (!d) return;
      // The newest coalesced sample, so fast flicks never trail the cursor.
      const last = e.getCoalescedEvents?.().at(-1) ?? e;
      const v = valueAtX(d, last.clientX);
      commit(v);
      if (d.glide) glideTo(d, v, S(900, 60));
      else value.jump(v);
    });
    const release = () => {
      if (!drag) return;
      drag = null;
      if (!reduce) animate(knob, { scale: 1 }, S(500, 16));
      // Settle on the whole number — or a preset when it lands close to one.
      const near = PRESETS.find((p) => Math.abs(p - target) <= 2);
      setValue(near ?? target, S(420, 34));
    };
    on(track, "pointerup", release);
    on(track, "pointercancel", release);
    on(track, "lostpointercapture", release);
    on(track, "keydown", (e) => {
      const step = e.shiftKey ? 10 : 1;
      const map: Record<string, number> = {
        ArrowRight: target + step,
        ArrowUp: target + step,
        ArrowLeft: target - step,
        ArrowDown: target - step,
        Home: 0,
        End: 100,
        PageUp: target + 10,
        PageDown: target - 10,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      setValue(map[e.key], S(500, 40));
    });

    /* ---------- Info tooltip ---------- */
    const info = q<HTMLButtonElement>(".ppimg__info");
    const tip = q<HTMLDivElement>(".ppimg__tip");
    let tipOpen = false;
    const showTip = (open: boolean) => {
      if (open === tipOpen) return;
      tipOpen = open;
      animate(tip, open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: -6 }, open ? S(500, 30) : { duration: 0.14 });
      if (!reduce) animate(info, { rotate: open ? 12 : 0, scale: open ? 1.08 : 1 }, S(400, 18));
    };
    on(info, "pointerenter", () => showTip(true));
    on(info, "pointerleave", () => showTip(false));
    on(info, "focus", () => showTip(true));
    on(info, "blur", () => showTip(false));
    on(info, "click", () => showTip(!tipOpen));

    /* ---------- Transition switcher ---------- */
    const fxNav = q<HTMLElement>(".ppimg__fx");
    const fxInd = q<HTMLDivElement>(".ppimg__fx-ind");
    const fxBtns = Array.from(root.querySelectorAll<HTMLButtonElement>(".ppimg__fx-btn"));
    const ind = { x: motionValue(0), w: motionValue(0) };
    const paintInd = () => {
      fxInd.style.transform = `translateX(${ind.x.get()}px)`;
      fxInd.style.width = `${ind.w.get()}px`;
    };
    cleanups.push(ind.x.on("change", paintInd), ind.w.on("change", paintInd));
    function selectFx(id: RevealFx, instant = false) {
      const b = fxBtns.find((x) => x.dataset.fx === id)!;
      fxBtns.forEach((x) => {
        x.setAttribute("aria-checked", String(x === b));
        x.tabIndex = x === b ? 0 : -1;
      });
      if (instant || reduce) {
        ind.x.jump(b.offsetLeft);
        ind.w.jump(b.offsetWidth);
        paintInd();
        fxInd.style.opacity = "1";
      } else {
        animate(ind.x, b.offsetLeft, S(520, 40));
        animate(ind.w, b.offsetWidth, S(520, 40));
      }
      // Keep the active option in view when the bar scrolls on narrow screens.
      const l = b.offsetLeft - fxNav.scrollLeft;
      const r = l + b.offsetWidth;
      if (l < 0 || r > fxNav.clientWidth) fxNav.scrollTo({ left: b.offsetLeft - 8, behavior: reduce ? "auto" : "smooth" });
    }
    function chooseFx(id: RevealFx) {
      if (id === fx) return;
      fx = id;
      engine.ensure(id);
      selectFx(id);
      // Replay the resolve in the new look, up to the current rollout value.
      if (reduce) return paintPhoto();
      reveal.jump(0);
      animate(reveal, 1, { duration: 1.8, ease: [0.32, 0.72, 0, 1] });
    }
    fxBtns.forEach((b, i) => {
      on(b, "click", () => chooseFx(b.dataset.fx as RevealFx));
      on(b, "pointerdown", () => !reduce && animate(b, { scale: 0.94 }, S(600, 30)));
      const up = () => !reduce && animate(b, { scale: 1 }, S(500, 18));
      on(b, "pointerup", up);
      on(b, "pointerleave", up);
      on(b, "keydown", (e) => {
        const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
        if (!d) return;
        e.preventDefault();
        const next = fxBtns[(i + d + fxBtns.length) % fxBtns.length];
        chooseFx(next.dataset.fx as RevealFx);
        next.focus();
      });
    });
    observe(fxNav, () => selectFx(fx, true));

    /* ---------- Entrance ---------- */
    const landing = clamp(defaultValue);
    (async () => {
      await document.fonts.ready;
      if (!alive) return;
      // the buttons' widths depend on the loaded face
      selectFx(fx, true);
      const blocks = root.querySelectorAll<HTMLElement>("[data-enter]");
      if (reduce) {
        blocks.forEach((b) => (b.style.opacity = "1"));
        pills.forEach((p) => (p.style.opacity = "1"));
        await imageReady;
        if (alive) setValue(landing);
        return;
      }
      animate(blocks, { opacity: [0, 1], y: [24, 0] }, { type: "spring", stiffness: 160, damping: 22, delay: stagger(0.12) });
      // Blur is tweened: a spring would overshoot into an invalid negative blur.
      animate(blocks, { filter: ["blur(10px)", "blur(0px)"] }, { duration: 0.55, ease: "easeOut", delay: stagger(0.12) });
      await animate(
        pills,
        { opacity: [0, 1], y: [10, 0], scale: [0.9, 1] },
        { type: "spring", stiffness: 380, damping: 24, delay: stagger(0.05, { startDelay: 0.3 }) },
      );
      // The photo "loads" to the landing value once its bytes arrive (or after 4s).
      await Promise.race([imageReady, new Promise((r) => setTimeout(r, 4000))]);
      if (alive) setValue(landing, { duration: 2.6, ease: [0.22, 1, 0.36, 1] });
    })();

    return () => {
      alive = false;
      cleanups.forEach((fn) => fn());
      value.stop();
      reveal.stop();
    };
  }, [src, defaultValue, defaultTransition]);

  return (
    <div ref={rootRef} className="ppimg" data-theme={theme}>
      {/* the goo filter: blurs the indicator blobs, then hardens the alpha so they melt together */}
      <svg className="ppimg__defs" aria-hidden="true">
        <defs>
          <filter id="ppimg-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <section className="ppimg__card" data-enter>
        <div className="ppimg__scene">
          <canvas className="ppimg__photo" role="img" aria-label={alt} />
          <div className="ppimg__shimmer" aria-hidden="true" />
          <div className="ppimg__edge" aria-hidden="true" />
        </div>

        <div className="ppimg__head">
          <h2 className="ppimg__title">Plugin Update Rollout</h2>
          <div className="ppimg__info-wrap">
            <button type="button" className="ppimg__info" aria-label="How the rollout works" aria-describedby="ppimg-tip">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 7v6" />
                <path d="M12 16.6v.1" />
              </svg>
            </button>
            <div id="ppimg-tip" role="tooltip" className="ppimg__tip">
              Users are bucketed randomly. Raising the percentage adds users; lowering it never removes the update from
              anyone who already has it.
            </div>
          </div>
        </div>

        <p className="ppimg__copy">
          Control how many users get access to the latest plugin update. Use the presets or drag the slider to schedule a
          safe release.
        </p>

        <div className="ppimg__presets" role="radiogroup" aria-label="Rollout presets">
          <div className="ppimg__blobs" aria-hidden="true">
            <div className="ppimg__blob ppimg__blob--trail" />
            <div className="ppimg__blob ppimg__blob--lead" />
          </div>
          {PRESETS.map((v) => (
            <button key={v} type="button" role="radio" className="ppimg__pill" style={{ opacity: 0 }}>
              {v}%
            </button>
          ))}
        </div>

        <p className="ppimg__label" id="ppimg-label">
          Deployment progress
        </p>
        <div
          className="ppimg__track"
          role="slider"
          tabIndex={0}
          aria-labelledby="ppimg-label"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="ppimg__fill">
            <span className="ppimg__pct">0%</span>
            <span className="ppimg__knob" />
          </div>
        </div>
      </section>

      <nav className="ppimg__fx" data-enter role="radiogroup" aria-label="Photo transition">
        <div className="ppimg__fx-ind" aria-hidden="true" />
        {REVEAL_FX.map(({ id, label }) => (
          <button key={id} type="button" role="radio" className="ppimg__fx-btn" data-fx={id}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
