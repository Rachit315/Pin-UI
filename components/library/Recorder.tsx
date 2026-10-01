"use client";

import { useEffect, useRef } from "react";
import { animate, hover, press, stagger } from "motion/react";
import "./recorder.css";

/* ------------------------------------------------------------------ props -- */

export type RecorderProps = {
  /** How wide the card is drawn, in px. It shrinks further to fit a small screen. */
  size?: number;
  /** Tactile clicks on every press and a tick as you scrub, synthesised at play time. */
  sound?: boolean;
  /** Take the keyboard as soon as it mounts, so Space and S work straight away. */
  autoFocus?: boolean;
  /** "dark" graphite, or "light" porcelain. The red key is the same in both. */
  theme?: "light" | "dark";
  /** Fired when a take is saved, with its length in seconds. */
  onSave?: (seconds: number) => void;
};

type Mode = "idle" | "recording" | "paused" | "saved" | "playing";

/* ---------------------------------------------------------------- motion -- */

const PRESS = { type: "spring", stiffness: 1100, damping: 42, mass: 0.5 } as const;
const RELEASE = { type: "spring", stiffness: 600, damping: 15, mass: 0.6 } as const;
const SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;
const SOFT = { type: "spring", stiffness: 170, damping: 22 } as const;
const ROLL = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const MORPH = { type: "spring", stiffness: 460, damping: 24 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pad2 = (n: number) => String(n).padStart(2, "0");

/* ---------------------------------------------------------------- geometry -- */

/* the card is authored at 700 × 700 and scaled to fit */
const SIZE = 700;

/** A radius-200 superellipse (n = 4), measured off the reference. */
function squirclePath(w: number, h: number, r: number, inset = 0, steps = 28) {
  const pts: string[] = [];
  const centers = [
    [w - r, r],
    [r, r],
    [r, h - r],
    [w - r, h - r],
  ];
  centers.forEach(([cx, cy], q) => {
    for (let i = 0; i <= steps; i++) {
      const t = ((q + i / steps) * Math.PI) / 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = cx + r * Math.sign(c) * Math.sqrt(Math.abs(c));
      const y = cy - r * Math.sign(s) * Math.sqrt(Math.abs(s));
      pts.push(`${(x + inset).toFixed(2)} ${(y + inset).toFixed(2)}`);
    }
  });
  return `M${pts.join("L")}Z`;
}

const CLIP = `path("${squirclePath(SIZE, SIZE, 200)}")`;
const RIM = squirclePath(SIZE - 2, SIZE - 2, 199, 1);

/* the waveform */
const BAR_DT = 0.1; // seconds per bar
const PITCH = 10;
const HEAD_X = 380;
const BAR_OFFSET = 11.5;
const MIN_H = 4;
const MAX_H = 340;
const COLLAPSE_MS = 460;
const RIPPLE_MS = 700;

const LABELS: Record<Mode, string> = { idle: "READY", recording: "REC", paused: "PAUSED", saved: "SAVED", playing: "PLAY" };
/* the status dot's fill per mode; recording and paused fall back to the red gradient in the stylesheet */
const DOT_COLOR: Record<Mode, string> = {
  idle: "var(--prec-dot-idle)",
  recording: "",
  paused: "",
  saved: "var(--prec-dot-saved)",
  playing: "var(--prec-dot-play)",
};
const MAIN_GLYPH = { idle: "rec", recording: "pause", paused: "rec", saved: "play", playing: "pause" } as const;
const SIDE_GLYPH = { idle: "stop", recording: "stop", paused: "stop", saved: "clear", playing: "stop" } as const;
const MAIN_LABEL: Record<Mode, string> = {
  idle: "Record",
  recording: "Pause",
  paused: "Resume recording",
  saved: "Play",
  playing: "Pause playback",
};

/* a damped spring from 0 → 1 as a bar is born */
const grow = (age: number) => (age >= 0.7 ? 1 : Math.max(0, 1 - Math.exp(-age * 14) * Math.cos(age * 20)));

/* -------------------------------------------------------------- component -- */

/**
 * A voice recorder card — no microphone.
 *
 * The input is a generated voice-like signal, and playback is a silent, timed
 * replay of the same take. Record, pause and resume on the red key; stop saves
 * the take, and on a saved take the side key becomes hold-to-clear. Drag the
 * waveform, scroll over the card or use the arrow keys to scrub.
 *
 * The waveform is a fixed pool of bars that scroll under a fixed playhead, all
 * drawn from one frame loop, so nothing is created or destroyed while it runs.
 */
export default function Recorder({ size = 360, sound = true, autoFocus = false, theme = "dark", onSave }: RecorderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const recDotRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const holdRef = useRef<SVGRectElement>(null);
  const glyphRefs = useRef<Record<string, HTMLElement | SVGSVGElement | null>>({});

  /* read at play time, so the prop can change without rebuilding the card */
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const root = rootRef.current!;
    const fit = fitRef.current!;
    const frame = frameRef.current!;
    const card = cardRef.current!;
    const wave = waveRef.current!;
    const barsEl = barsRef.current!;
    const dotsEl = dotsRef.current!;
    const playhead = playheadRef.current!;
    const recDot = recDotRef.current!;
    const labelWrap = labelRef.current!;
    const timerEl = timerRef.current!;
    const kSide = sideRef.current!;
    const kMain = mainRef.current!;
    const holdRect = holdRef.current!;
    const G = glyphRefs.current as Record<string, HTMLElement>;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alive = true;
    const cleanups: (() => void)[] = [];
    const listen = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement | Window,
      type: K | string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions,
    ) => {
      el.addEventListener(type, fn as EventListener, opts);
      cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    /*
     * ── size: a compact card, shrinking further to fit ──
     * It measures the box it was put in rather than the window, so it fits a
     * sidebar or a stage as well as a page.
     */
    const host = root.parentElement ?? root;
    function fitToViewport() {
      const cs = getComputedStyle(host);
      const inner = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const room = Math.min(inner > 0 ? inner : window.innerWidth, window.innerWidth - 32);
      const s = Math.min(size / SIZE, room / SIZE, (window.innerHeight - 48) / SIZE);
      frame.style.transform = `scale(${s})`;
      fit.style.width = `${SIZE * s}px`;
      fit.style.height = `${SIZE * s}px`;
    }
    fitToViewport();
    listen(window, "resize", fitToViewport);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(fitToViewport);
      observer.observe(host);
      cleanups.push(() => observer.disconnect());
    }

    /* ── state: idle → recording ⇄ paused → saved ⇄ playing ── */
    const S = { mode: "idle" as Mode, elapsed: 0, cursor: 0, nextBarAt: BAR_DT, view: 0 };
    let samples: { h: number; t: number }[] = [];

    /* ── tactile sound (Web Audio, made on the first press) ── */
    let ctx: AudioContext | undefined;
    let noiseBuf: AudioBuffer | undefined;
    function click(kind: "down" | "up" | "tick" = "down", gain = 1) {
      if (!soundRef.current) return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx ??= new Ctx();
        if (ctx.state === "suspended") void ctx.resume();
      } catch {
        return;
      }
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      }
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = kind === "down" ? 2200 : kind === "tick" ? 5200 : 3400;
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.value = (kind === "down" ? 0.45 : kind === "tick" ? 0.08 : 0.24) * gain;
      src.connect(bp).connect(g).connect(ctx.destination);
      src.start(t);
      if (kind === "down") {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(50, t + 0.05);
        og.gain.setValueAtTime(0.12 * gain, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        o.connect(og).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.07);
      }
    }
    const haptic = (ms = 8) => navigator.vibrate?.(ms);

    /* ── timer: HH:MM:SS, the digits roll and soften through a blur ── */
    timerEl.replaceChildren();
    const slots: HTMLSpanElement[] = [];
    "00:00:00".split("").forEach((ch) => {
      const el = document.createElement("span");
      if (ch === ":") {
        el.className = "prec__colon";
        el.textContent = ":";
        timerEl.append(el);
        return;
      }
      el.className = "prec__slot";
      el.innerHTML = "<span>0</span>";
      el.dataset.v = "0";
      timerEl.append(el);
      slots.push(el);
    });

    function setDigit(slot: HTMLSpanElement, ch: string, dir: number) {
      if (slot.dataset.v === ch) return;
      slot.dataset.v = ch;
      if (reduceMotion) {
        slot.innerHTML = `<span>${ch}</span>`;
        return;
      }
      const h = slot.offsetHeight || 58;
      const prev = slot.lastElementChild as HTMLElement | null;
      const next = document.createElement("span");
      next.textContent = ch;
      slot.append(next);
      animate(next, { y: [dir * h * 0.75, 0], opacity: [0, 1], filter: ["blur(5px)", "blur(0px)"] }, ROLL);
      if (prev) animate(prev, { y: -dir * h * 0.75, opacity: 0, filter: "blur(5px)" }, ROLL).then(() => prev.remove());
    }

    let lastSec = -1;
    function renderTimer(sec: number) {
      const s = Math.floor(sec + 1e-6);
      if (s === lastSec) return;
      const dir = s >= lastSec ? 1 : -1;
      lastSec = s;
      const str = pad2(Math.floor(s / 3600) % 100) + pad2(Math.floor(s / 60) % 60) + pad2(s % 60);
      str.split("").forEach((ch, i) => setDigit(slots[i], ch, dir));
    }

    /* ── waveform: pooled bars that scroll under a fixed playhead ── */
    barsEl.replaceChildren();
    dotsEl.replaceChildren();
    const POOL = Math.ceil(SIZE / PITCH) + 12;
    const pool = Array.from({ length: POOL }, () => {
      const el = document.createElement("span");
      el.className = "prec__bar";
      el.style.opacity = "0";
      barsEl.append(el);
      return { el, on: false, tf: "", op: -1, used: false };
    });

    const dots: { el: HTMLSpanElement; x: number; a: number }[] = [];
    for (let x = 392; x <= 672; x += 9) {
      const d = document.createElement("span");
      d.className = "prec__dot";
      d.style.left = `${x}px`;
      dotsEl.append(d);
      dots.push({ el: d, x, a: 1 });
    }

    const fx = { collapseAt: 0, rippleAt: 0 };

    function targetHead() {
      return S.mode === "recording" || S.mode === "paused" ? S.elapsed : S.cursor;
    }

    function renderWave(now: number) {
      const hIdx = S.view / BAR_DT;
      const n = samples.length;
      const reviewing = S.mode === "saved" || S.mode === "playing";
      const kFrom = Math.max(0, Math.floor(hIdx - HEAD_X / PITCH) - 2);
      const kTo = Math.min(n - 1, Math.ceil(hIdx + (SIZE - HEAD_X) / PITCH) + 2);
      const collapseP = fx.collapseAt ? (now - fx.collapseAt) / COLLAPSE_MS : 0;
      const rippleP = fx.rippleAt ? (now - fx.rippleAt) / RIPPLE_MS : 0;
      if (rippleP > 1) fx.rippleAt = 0;

      for (const p of pool) p.used = false;
      let lastX = -Infinity;

      for (let k = kFrom; k <= kTo; k++) {
        const x = HEAD_X - BAR_OFFSET - (hIdx - (k + 1)) * PITCH;
        if (x < -4 || x > SIZE) continue;
        const s = samples[k];
        let h = s.h * grow((now - s.t) / 1000);
        if (collapseP) {
          const d = Math.abs(HEAD_X - x) / HEAD_X;
          const local = clamp(collapseP * 1.7 - d * 0.7, 0, 1);
          h *= 1 - local * local * (3 - 2 * local);
        }
        if (rippleP) {
          const u = rippleP * 1.6 - (HEAD_X - x) / HEAD_X;
          if (u > 0 && u < 1) h *= 1 + 0.16 * Math.sin(Math.PI * u);
        }
        /* played and unplayed crossfade over about a bar and a half instead of flipping */
        const ahead = reviewing ? clamp((x - HEAD_X + 6) / 15, 0, 1) : 0;
        const op = 1 - 0.72 * ahead;
        const p = pool[k % POOL];
        p.used = true;
        lastX = Math.max(lastX, x);
        const tf = `translate3d(${x.toFixed(2)}px,5px,0) scaleY(${(Math.max(h, 0) / MAX_H).toFixed(4)})`;
        if (p.tf !== tf) {
          p.el.style.transform = tf;
          p.tf = tf;
        }
        if (Math.abs(p.op - op) > 0.004 || !p.on) {
          p.el.style.opacity = op.toFixed(3);
          p.op = op;
          p.on = true;
        }
      }
      for (const p of pool) {
        if (!p.used && p.on) {
          p.el.style.opacity = "0";
          p.on = false;
          p.op = -1;
        }
      }
      /* the dotted track fades out where audio takes its place */
      const edge = Math.max(HEAD_X + 6, lastX + 6);
      for (const d of dots) {
        const a = clamp((d.x - edge) / 10, 0, 1);
        if (Math.abs(a - d.a) > 0.01) {
          d.a = a;
          d.el.style.opacity = a.toFixed(2);
        }
      }
    }

    function collapseWave() {
      if (!samples.length || reduceMotion) {
        samples = [];
        return Promise.resolve();
      }
      fx.collapseAt = performance.now();
      return new Promise<void>((r) =>
        later(COLLAPSE_MS, () => {
          samples = [];
          fx.collapseAt = 0;
          r();
        }),
      );
    }

    /* generated "speech": words with a rise-and-fall envelope, then pauses */
    const voice = { i: 0, len: 0, peak: 0, speaking: false };
    function nextHeight() {
      if (voice.i >= voice.len) {
        voice.speaking = !voice.speaking;
        voice.i = 0;
        voice.len = voice.speaking ? 4 + Math.floor(Math.random() * 7) : 2 + Math.floor(Math.random() * 5);
        voice.peak = 0.55 + Math.random() * 0.45;
      }
      const u = (voice.i + 0.5) / voice.len;
      voice.i++;
      if (!voice.speaking) return MIN_H + Math.random() * 8;
      const env = Math.pow(Math.sin(Math.PI * u), 0.6);
      const a = clamp(env * voice.peak * (0.55 + Math.random() * 0.45), 0.02, 1);
      return MIN_H + Math.pow(a, 1.3) * (MAX_H - MIN_H);
    }

    /* ── status, glyph morphs, indicators ── */
    labelWrap.replaceChildren();
    const firstLabel = document.createElement("span");
    firstLabel.className = "prec__labelText";
    firstLabel.textContent = "READY";
    labelWrap.append(firstLabel);
    let currentLabel = "READY";
    function setLabel(text: string) {
      if (text === currentLabel) return;
      currentLabel = text;
      const prev = labelWrap.lastElementChild as HTMLElement | null;
      const next = document.createElement("span");
      next.className = "prec__labelText";
      next.textContent = text;
      labelWrap.append(next);
      if (reduceMotion) {
        prev?.remove();
        return;
      }
      animate(next, { y: [20, 0], opacity: [0, 1], filter: ["blur(4px)", "blur(0px)"] }, SPRING);
      if (prev) animate(prev, { y: -20, opacity: 0, filter: "blur(4px)" }, { duration: 0.2, ease: [0.4, 0, 1, 1] }).then(() => prev.remove());
    }

    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    function flash(text: string, ms = 1100) {
      if (flashTimer) clearTimeout(flashTimer);
      setLabel(text);
      flashTimer = later(ms, () => {
        flashTimer = null;
        setLabel(LABELS[S.mode]);
      });
    }
    const refreshLabel = () => !flashTimer && setLabel(LABELS[S.mode]);

    let dotBlink: { stop: () => void } | undefined;
    let timerBlink: { stop: () => void } | undefined;
    function refreshIndicators() {
      dotBlink?.stop();
      timerBlink?.stop();
      recDot.style.background = DOT_COLOR[S.mode];
      if (reduceMotion) return;
      animate(recDot, { scale: [0.6, 1] }, RELEASE);
      animate(timerEl, { opacity: 1 }, { duration: 0.2 });
      if (S.mode === "recording") {
        dotBlink = animate(recDot, { opacity: [1, 0.2, 1] }, { duration: 1.2, repeat: Infinity, ease: "easeInOut" });
      } else {
        animate(recDot, { opacity: S.mode === "paused" ? 0.55 : 1 }, { duration: 0.2 });
      }
      if (S.mode === "paused") {
        timerBlink = animate(timerEl, { opacity: [1, 0.3, 1] }, { duration: 1.2, repeat: Infinity, ease: "easeInOut" });
      }
    }

    const shown: { main: string; side: string } = { main: "rec", side: "stop" };
    function morph(group: "main" | "side", next: string) {
      if (shown[group] === next) return;
      const out = G[shown[group]];
      const inn = G[next];
      shown[group] = next;
      if (reduceMotion) {
        out.style.opacity = "0";
        inn.style.opacity = "1";
        return;
      }
      animate(out, { opacity: 0, scale: 0.5, rotate: -25, filter: "blur(3px)" }, { duration: 0.16, ease: [0.4, 0, 1, 1] });
      animate(inn, { opacity: [0, 1], scale: [0.5, 1], rotate: [25, 0], filter: ["blur(3px)", "blur(0px)"] }, MORPH);
    }

    function refreshControls() {
      morph("main", MAIN_GLYPH[S.mode]);
      morph("side", SIDE_GLYPH[S.mode]);
      const sideOn = S.mode !== "idle";
      kSide.disabled = !sideOn;
      animate(kSide.querySelector(".prec__glyphs")!, { opacity: sideOn ? 1 : 0.35 }, { duration: 0.25 });
      kMain.setAttribute("aria-label", MAIN_LABEL[S.mode]);
      kSide.setAttribute("aria-label", S.mode === "saved" ? "Hold to clear the recording" : "Stop");
      kSide.title = S.mode === "saved" ? "Hold to clear  (hold S)" : "Stop  (S)";
      wave.style.cursor = S.mode === "saved" || S.mode === "playing" ? "grab" : "default";
    }

    function setMode(mode: Mode) {
      S.mode = mode;
      refreshLabel();
      refreshIndicators();
      refreshControls();
    }

    /* ── actions ── */
    function wiggle(el: HTMLElement) {
      if (!reduceMotion) animate(el, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.36, ease: "easeOut" });
    }

    function startTake() {
      Object.assign(S, { elapsed: 0, cursor: 0, nextBarAt: BAR_DT, view: 0 });
      samples = [];
      voice.i = voice.len = 0;
      voice.speaking = false;
      setMode("recording");
    }

    function saveTake() {
      S.cursor = S.elapsed;
      fx.rippleAt = performance.now();
      setMode("saved");
      onSaveRef.current?.(S.elapsed);
    }

    let playStart = 0;
    let playFrom = 0;
    function startPlayback() {
      if (S.elapsed <= 0) return;
      /* from the end, rewind — the waveform glides back rather than jumping */
      if (S.cursor >= S.elapsed - 0.05) S.cursor = 0;
      playFrom = S.cursor;
      playStart = performance.now();
      setMode("playing");
    }

    async function clearTake() {
      setMode("idle");
      flash("CLEARED", 1000);
      await collapseWave();
      Object.assign(S, { elapsed: 0, cursor: 0, view: 0 });
    }

    const actions = {
      main() {
        switch (S.mode) {
          case "idle":
            return startTake();
          case "recording":
            return setMode("paused");
          case "paused":
            return setMode("recording");
          case "saved":
            return startPlayback();
          case "playing":
            return setMode("saved");
        }
      },
      side() {
        switch (S.mode) {
          case "recording":
          case "paused":
            return saveTake();
          case "playing":
            S.cursor = S.elapsed;
            return setMode("saved");
        }
      },
    };

    /* ── press physics ── */
    function down(btn: HTMLElement, scale: number) {
      btn.classList.add("is-down");
      animate(btn, { scale }, PRESS);
      animate(btn.querySelector(".prec__glyphs")!, { scale: 0.88 }, PRESS);
      click("down");
      haptic();
    }
    function up(btn: HTMLElement) {
      btn.classList.remove("is-down");
      animate(btn, { scale: 1 }, RELEASE);
      animate(btn.querySelector(".prec__glyphs")!, { scale: 1 }, RELEASE);
      click("up");
    }

    cleanups.push(
      press(kMain, (el) => {
        down(el as HTMLElement, 0.93);
        actions.main();
        return () => up(el as HTMLElement);
      }),
    );

    /* the side key taps to stop; on a saved take it becomes hold-to-clear */
    type Hold = { anim: ReturnType<typeof animate>; done?: boolean };
    let hold: Hold | null = null;
    let holdShown = 0;
    const setHold = (v: number) => (holdRect.style.strokeDashoffset = String(1 - (holdShown = v)));
    function holdStart() {
      if (S.mode !== "saved") return false;
      const h = {} as Hold;
      h.anim = animate(holdShown, 1, { duration: 0.7 * (1 - holdShown), ease: "linear", onUpdate: setHold });
      h.anim.then(() => {
        if (hold !== h || !alive) return;
        h.done = true;
        haptic(18);
        click("down", 1.2);
        animate(holdShown, 0, { duration: 0.35, delay: 0.15, onUpdate: setHold });
        void clearTake();
      });
      hold = h;
      return true;
    }
    function holdEnd() {
      const h = hold;
      hold = null;
      if (!h || h.done) return;
      h.anim.stop();
      animate(holdShown, 0, { ...SPRING, onUpdate: setHold });
      flash("HOLD", 1000);
    }
    cleanups.push(
      press(kSide, (el) => {
        const btn = el as HTMLButtonElement;
        if (btn.disabled) {
          wiggle(btn);
          return;
        }
        down(btn, 0.95);
        const holding = holdStart();
        if (!holding) actions.side();
        return () => {
          up(btn);
          if (holding) holdEnd();
        };
      }),
    );

    [kMain, kSide].forEach((btn) =>
      cleanups.push(
        hover(btn, (el) => {
          const b = el as HTMLButtonElement;
          if (!b.classList.contains("is-down") && !b.disabled) animate(b, { scale: 1.03 }, SPRING);
          return () => {
            if (!b.classList.contains("is-down")) animate(b, { scale: 1 }, SPRING);
          };
        }),
      ),
    );

    /* ── scrubbing: drag the waveform or scroll over the card ── */
    const canScrub = () => S.mode === "saved" || S.mode === "playing";
    let lastTickIdx = -1;
    function scrubBy(sec: number) {
      S.cursor = clamp(S.cursor + sec, 0, S.elapsed);
      if (S.mode === "playing") {
        playFrom = S.cursor;
        playStart = performance.now();
      }
      const idx = Math.floor(S.cursor / BAR_DT);
      if (idx !== lastTickIdx) {
        lastTickIdx = idx;
        click("tick");
      }
    }

    let drag: { x: number; was: boolean } | null = null;
    listen(wave, "pointerdown", (e: PointerEvent) => {
      if (!canScrub()) return;
      wave.setPointerCapture(e.pointerId);
      wave.style.cursor = "grabbing";
      drag = { x: e.clientX, was: S.mode === "playing" };
      if (drag.was) setMode("saved");
    });
    listen(wave, "pointermove", (e: PointerEvent) => {
      if (!drag) return;
      const scale = frame.getBoundingClientRect().width / SIZE;
      const dx = (e.clientX - drag.x) / scale;
      drag.x = e.clientX;
      scrubBy((-dx / PITCH) * BAR_DT);
    });
    const endDrag = () => {
      if (!drag) return;
      const { was } = drag;
      drag = null;
      wave.style.cursor = canScrub() ? "grab" : "default";
      if (was && S.cursor < S.elapsed - 0.05) startPlayback();
    };
    listen(wave, "pointerup", endDrag);
    listen(wave, "pointercancel", endDrag);

    listen(
      card,
      "wheel",
      (e: WheelEvent) => {
        if (!canScrub()) return;
        e.preventDefault();
        scrubBy((e.deltaY + e.deltaX) * 0.004);
      },
      { passive: false },
    );

    /*
     * The keyboard: Space records, pauses and plays, S stops (hold it to clear
     * a saved take), and the arrows scrub. It listens on the card rather than
     * on the whole page, so it never swallows a Space meant to scroll.
     */
    listen(root, "keydown", (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "arrowright") {
        if (!canScrub()) return;
        e.preventDefault();
        scrubBy(k === "arrowleft" ? -1 : 1);
        return;
      }
      if (k !== " " && k !== "s") return;
      e.preventDefault();
      if (e.repeat) return;
      if (k === " ") {
        down(kMain, 0.93);
        actions.main();
        later(110, () => up(kMain));
      } else if (kSide.disabled) {
        wiggle(kSide);
      } else {
        down(kSide, 0.95);
        if (!holdStart()) {
          actions.side();
          later(110, () => up(kSide));
        }
      }
    });
    listen(root, "keyup", (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && hold) {
        up(kSide);
        holdEnd();
      }
    });

    /* ── the frame loop ── */
    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      if (!alive) return;
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;

      if (S.mode === "recording") {
        S.elapsed += dt;
        while (S.elapsed >= S.nextBarAt) {
          samples.push({ h: nextHeight(), t: now });
          S.nextBarAt += BAR_DT;
        }
      } else if (S.mode === "playing") {
        S.cursor = clamp(playFrom + (now - playStart) / 1000, 0, S.elapsed);
        if (S.cursor >= S.elapsed) {
          S.cursor = S.elapsed;
          setMode("saved");
        }
      }

      /* the waveform follows the head with feed-forward and a critically damped
         correction: exact while moving, and a glide across any jump */
      const target = targetHead();
      const moving = S.mode === "recording" || S.mode === "playing" ? 1 : 0;
      S.view += moving * dt;
      S.view += (target - S.view) * (1 - Math.exp(-dt * (reduceMotion ? 1e3 : 9)));

      renderWave(now);
      renderTimer(target);
      raf = requestAnimationFrame(tick);
    }

    /* ── boot ── */
    renderTimer(0);
    setMode("idle");

    if (reduceMotion) {
      card.style.opacity = "1";
    } else {
      animate(card, { opacity: [0, 1], y: [28, 0], scale: [0.94, 1] }, SOFT);
      animate([kSide, kMain], { opacity: [0, 1], scale: [0.6, 1] }, { delay: stagger(0.08, { startDelay: 0.22 }), ...RELEASE });
      animate([recDot, labelWrap, timerEl], { opacity: [0, 1], x: [-12, 0] }, { delay: stagger(0.06, { startDelay: 0.28 }), ...SPRING });
      animate(
        dots.map((d) => d.el),
        { opacity: [0, 1], scaleY: [0, 1] },
        { delay: stagger(0.016, { startDelay: 0.32 }), duration: 0.35 },
      );
      animate(playhead, { scaleY: [0, 1] }, { delay: 0.28, ...SPRING });
    }

    if (autoFocus) root.focus({ preventScroll: true });

    raf = requestAnimationFrame((t) => {
      last = t;
      raf = requestAnimationFrame(tick);
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      if (flashTimer) clearTimeout(flashTimer);
      dotBlink?.stop();
      timerBlink?.stop();
      cleanups.forEach((fn) => fn());
      void ctx?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const glyph = (name: string) => (el: HTMLElement | SVGSVGElement | null) => {
    glyphRefs.current[name] = el;
  };

  return (
    <div ref={rootRef} className="prec" data-theme={theme} tabIndex={-1} aria-label="Voice recorder">
      <div ref={fitRef} className="prec__fit">
        <div ref={frameRef} className="prec__frame">
          <div ref={cardRef} className="prec__card" style={{ clipPath: CLIP }}>
            <div className="prec__bg" />

            {/* ── the waveform ── */}
            <div ref={waveRef} className="prec__wave" aria-hidden="true">
              <div ref={barsRef} className="prec__bars" />
              <div ref={dotsRef} className="prec__dots" />
              {/* progressive glass: each layer blurs harder and covers less, toward the edge */}
              <div className="prec__edge prec__edge--l">
                <i /><i /><i /><i /><i /><i />
              </div>
              <div className="prec__edge prec__edge--r">
                <i /><i /><i /><i /><i /><i />
              </div>
              <div ref={playheadRef} className="prec__playhead" />
            </div>

            {/* ── status and timer ── */}
            <span ref={recDotRef} className="prec__recDot" />
            <div ref={labelRef} className="prec__label" aria-live="polite" />
            <div ref={timerRef} className="prec__timer" aria-label="Elapsed time" />

            {/* ── controls ── */}
            <button ref={sideRef} type="button" className="prec__side" aria-label="Stop" title="Stop  (S)">
              <svg className="prec__hold" width="107" height="171" viewBox="0 0 107 171" aria-hidden="true">
                <rect
                  ref={holdRef}
                  x="2"
                  y="2"
                  width="103"
                  height="167"
                  rx="51.5"
                  fill="none"
                  stroke="#f2322f"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                />
              </svg>
              <span className="prec__glyphs">
                <span ref={glyph("stop")} className="prec__glyph prec__stop" />
                <svg
                  ref={glyph("clear")}
                  className="prec__glyph prec__clear"
                  style={{ opacity: 0 }}
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4A8.6 8.6 0 1 1 4.55 8.3" />
                  <path d="M1.52 8.45 5 7.52 5.93 11" />
                </svg>
              </span>
            </button>

            <button ref={mainRef} type="button" className="prec__main" aria-label="Record" title="Record  (Space)">
              <span className="prec__glyphs">
                <span ref={glyph("rec")} className="prec__glyph prec__recGlyph" />
                <span ref={glyph("pause")} className="prec__glyph prec__pause" style={{ opacity: 0 }}>
                  <span />
                  <span />
                </span>
                <svg
                  ref={glyph("play")}
                  className="prec__glyph"
                  style={{ opacity: 0 }}
                  width="40"
                  height="44"
                  viewBox="0 0 40 44"
                  aria-hidden="true"
                >
                  <path
                    d="M8 5.6v32.8c0 2.3 2.5 3.7 4.5 2.5l26-16.4a2.9 2.9 0 0 0 0-5L12.5 3.1C10.5 1.9 8 3.3 8 5.6Z"
                    fill="#f6e2e1"
                  />
                </svg>
              </span>
            </button>

            {/* a continuous-curvature rim, drawn from the same path as the clip */}
            <svg className="prec__rim" width="700" height="700" viewBox="0 0 700 700" aria-hidden="true">
              <defs>
                <linearGradient id="prec-rim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="prec__rimStop prec__rimStop--0" />
                  <stop offset="0.25" className="prec__rimStop prec__rimStop--1" />
                  <stop offset="1" className="prec__rimStop prec__rimStop--2" />
                </linearGradient>
              </defs>
              <path d={RIM} fill="none" stroke="url(#prec-rim)" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
