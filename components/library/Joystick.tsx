"use client";

import { useEffect, useRef } from "react";
import { animate, motionValue } from "motion/react";
import "./joystick.css";

/**
 * Joystick — a pixel-art arcade stick you can grab and throw.
 *
 * The stick is rasterised every frame onto a 64 × 52 canvas rather than drawn
 * from a sprite, so every tilt angle stays crisp, outlined and dithered like
 * hand-made pixel art, then scaled up by whole pixels. It sits in an octagonal
 * restrictor gate: drag it and it tracks the hand with a little mass, let go
 * and the return spring overshoots and settles like a real stick. Four
 * microswitches click as it crosses into each direction, the shaft thocks on
 * the gate, and the spring twangs on release — all synthesised, with haptics
 * on phones and rumble on gamepads.
 *
 * Drag it, or focus it and use the arrow keys or WASD; a connected gamepad's
 * stick or d-pad drives it too.
 */

export type JoystickDirection = "up" | "down" | "left" | "right";

export type JoystickProps = {
  /** The size of one art pixel, in CSS pixels. It shrinks to fit a narrow container. */
  pixel?: number;
  /** Microswitch clicks, the gate thock and the spring's twang. */
  sound?: boolean;
  theme?: "light" | "dark";
  /** Take keyboard focus on mount, so the arrow keys work straight away. */
  autoFocus?: boolean;
  /** Fired as the stick moves: x and y in −1…1, +x right and +y toward the player. */
  onMove?: (x: number, y: number) => void;
  /** Fired as each microswitch makes (true) and breaks (false). */
  onSwitch?: (direction: JoystickDirection, on: boolean) => void;
};

/* ── the art: a 64 × 52 canvas ────────────────────────────────────────────── */

const W = 64;
const H = 52;

/* RGBA bytes, little-endian, for a Uint32Array over ImageData */
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};

const C = {
  out: hex("#17161c"),
  white: hex("#f7f7f5"),
  g1: hex("#d9dadc"),
  g2: hex("#b2b4b9"),
  g3: hex("#85878e"),
  r0: hex("#5c0b13"),
  r1: hex("#981520"),
  r2: hex("#cf222d"),
  r3: hex("#ea4850"),
  r4: hex("#ff8b90"),
  r5: hex("#ffe1e2"),
};

const PIVOT = { x: 32, y: 40 };
/** Pivot to ball centre, in art pixels. */
const STICK = 17;
/** Chosen so the circle rasterises without single-pixel nubs. */
const BALL_R = 9;
/** About 30°. */
const MAX_TILT = 0.52;
/** The camera looks down about 22°. */
const PITCH = 0.38;
const PLATE = { rx: 13.5, ry: 4.2 };

type Inside = (x: number, y: number) => boolean;
const ellipse =
  (cx: number, cy: number, rx: number, ry: number): Inside =>
  (x, y) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const dither = (x: number, y: number, a: number) => (((x + y) & 1) === 1 ? a : -a);

function createRenderer(canvas: HTMLCanvasElement) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const px = new Uint32Array(img.data.buffer);
  const mask = new Uint8Array(W * H);

  /* fill a shape, optionally wrapping it in a 1px dark outline first */
  function shape(inside: Inside, color: number | ((x: number, y: number) => number), outline = true) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mask[y * W + x] = inside(x + 0.5, y + 0.5) ? 1 : 0;

    if (outline) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (mask[i]) continue;
          if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W]))
            px[i] = C.out;
        }
      }
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (mask[i]) px[i] = typeof color === "function" ? color(x, y) : color;
      }
    }
  }

  /** jx, jy inside the gate (about −1…1); +x is right, +y toward the player. */
  function draw(jx: number, jy: number) {
    px.fill(0);
    const { x: Px, y: Py } = PIVOT;

    /* the stick's 3D direction, onto the screen */
    let dx = Math.tan(jx * MAX_TILT);
    let dy = 1;
    let dz = Math.tan(jy * MAX_TILT);
    const n = Math.hypot(dx, dy, dz);
    dx /= n;
    dy /= n;
    dz /= n;
    const bx = Px + STICK * dx;
    const by = Py + STICK * (-dy * Math.cos(PITCH) + dz * Math.sin(PITCH));
    /* nearer is a touch bigger */
    const R = BALL_R * (1 + dz * 0.1);

    /* the plate: its rim for thickness, then its top */
    shape(ellipse(Px, Py + 2, PLATE.rx, PLATE.ry), (x) => (x > Px + 6 ? C.g3 : C.g2));
    const plate = ellipse(Px, Py, PLATE.rx, PLATE.ry);
    shape(plate, (x, y) => {
      const s = ((x - Px) / PLATE.rx) * 0.6 + ((y - Py) / PLATE.ry) * 0.8 + dither(x, y, 0.06);
      return s > 0.55 ? C.g1 : C.white;
    });

    /* the ball's shadow on the plate */
    const shadow = ellipse(Px + (bx - Px) * 0.9, Py + dz * 1.5, 5.5, 1.7);
    shape((x, y) => shadow(x, y) && plate(x, y), C.g1, false);

    /* the dust washer and the shaft's hole */
    shape(ellipse(Px, Py, 4.6, 1.6), C.g2, false);
    shape(ellipse(Px, Py, 2.2, 0.9), C.g3, false);

    /* the shaft */
    const vx = bx - Px;
    const vy = by - Py;
    const len2 = vx * vx + vy * vy || 1;
    const len = Math.sqrt(len2);
    shape(
      (x, y) => {
        const t = Math.max(0, Math.min(1, ((x - Px) * vx + (y - Py) * vy) / len2));
        return Math.hypot(x - (Px + vx * t), y - (Py + vy * t)) <= 1.75;
      },
      (x, y) => {
        /* positive is to the right of the shaft */
        const side = -((x + 0.5 - Px) * vy - (y + 0.5 - Py) * vx) / len;
        return side > 0.55 ? C.g2 : C.white;
      },
    );

    /* the ball, banded and dithered */
    shape(
      (x, y) => (x - bx) ** 2 + (y - by) ** 2 <= R * R,
      (x, y) => {
        const nx = (x + 0.5 - bx) / R;
        const ny = (y + 0.5 - by) / R;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const l = -0.42 * nx - 0.62 * ny + 0.66 * nz;
        if (l > 0.955) return C.r5;
        const d = l + dither(x, y, 0.05);
        if (d > 0.84) return C.r4;
        if (d > 0.6) return C.r3;
        if (d > 0.22) return C.r2;
        if (d > -0.12) return C.r1;
        return C.r0;
      },
    );

    ctx.putImageData(img, 0, 0);
  }

  return { draw };
}

/* ── the gate and the springs ─────────────────────────────────────────────── */

/* the octagonal restrictor gate, its flat sides facing the eight directions */
const OCT = Math.PI / 8;
function clampToGate(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y);
  if (r === 0) return [0, 0];
  const a = Math.atan2(y, x);
  const m = ((((a + OCT) % (2 * OCT)) + 2 * OCT) % (2 * OCT)) - OCT;
  const max = 1 / Math.cos(m) - 0.0001;
  return r > max ? [(x / r) * max, (y / r) * max] : [x, y];
}

/* held, it tracks the hand almost 1:1 with a little mass */
const HOLD = { type: "spring", stiffness: 1500, damping: 50, mass: 0.45 } as const;
/* let go, the return spring overshoots and settles like a real stick */
const RETURN = { type: "spring", stiffness: 540, damping: 10, mass: 0.55 } as const;
const RETURN_REDUCED = { type: "spring", stiffness: 500, damping: 40 } as const;

/** Switch "make" travel. */
const ON = 0.42;
/** Switch "break" travel — lower than make, so a stick resting on the line never chatters. */
const OFF = 0.3;

const KEYMAP: Record<string, JoystickDirection> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/* ── component ────────────────────────────────────────────────────────────── */

export default function Joystick({
  pixel = 8,
  sound = true,
  theme = "light",
  autoFocus = false,
  onMove,
  onSwitch,
}: JoystickProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* read live inside the engine, so changing them never rebuilds it */
  const soundRef = useRef(sound);
  const muteRef = useRef<(muted: boolean) => void>(() => {});
  const onMoveRef = useRef(onMove);
  const onSwitchRef = useRef(onSwitch);
  const pixelRef = useRef(pixel);
  const fitRef = useRef<() => void>(() => {});
  onMoveRef.current = onMove;
  onSwitchRef.current = onSwitch;

  useEffect(() => {
    soundRef.current = sound;
    muteRef.current(!sound);
  }, [sound]);

  useEffect(() => {
    pixelRef.current = pixel;
    fitRef.current();
  }, [pixel]);

  useEffect(() => {
    const root = rootRef.current!;
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const cleanups: (() => void)[] = [];
    let alive = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── sound: synthesised with Web Audio, no files ── */
    const sfx = (() => {
      const VOLUME = 0.22;
      let ctx: AudioContext | null = null;
      let bus: GainNode | null = null;
      let noise: AudioBuffer | null = null;
      let muted = !soundRef.current;

      /*
       * Building the engine costs the main thread a noticeable slice, and built
       * inside the first grab it would stall that grab's first frames. So it is
       * built in idle time once the stick is on screen — suspended, if the page
       * has not seen a gesture yet — and the grab only has to resume it.
       */
      function build() {
        if (ctx) return;
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 6;
        bus = ctx.createGain();
        bus.gain.value = muted ? 0 : VOLUME;
        bus.connect(comp).connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      function unlock() {
        if (!ctx) build();
        if (ctx?.state === "suspended") void ctx.resume();
      }
      function warm() {
        if (alive) build();
      }
      const ready = () => !muted && ctx && bus && noise && ctx.state === "running";

      function tone({
        type = "square" as OscillatorType,
        freq,
        to,
        t,
        dur,
        gain,
        release = 0.03,
      }: {
        type?: OscillatorType;
        freq: number;
        to?: number;
        t: number;
        dur: number;
        gain: number;
        release?: number;
      }) {
        const o = ctx!.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
        const g = ctx!.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.003);
        g.gain.setValueAtTime(gain, Math.max(t + 0.004, t + dur - release));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(bus!);
        o.start(t);
        o.stop(t + dur + 0.02);
        return o;
      }

      function hit({
        t,
        dur,
        gain,
        type = "highpass" as BiquadFilterType,
        freq = 6000,
        q = 0.8,
      }: {
        t: number;
        dur: number;
        gain: number;
        type?: BiquadFilterType;
        freq?: number;
        q?: number;
      }) {
        const src = ctx!.createBufferSource();
        src.buffer = noise;
        const f = ctx!.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx!.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(bus!);
        src.start(t, Math.random() * 0.3);
        src.stop(t + dur + 0.02);
      }

      return {
        unlock,
        warm,
        setMuted(value: boolean) {
          muted = value;
          if (ctx && bus) bus.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.02);
        },
        /* microswitch: a crisp click on make, a softer one on break */
        click(make: boolean) {
          if (!ready()) return;
          const t = ctx!.currentTime;
          hit({ t, dur: make ? 0.016 : 0.01, gain: make ? 0.5 : 0.22, freq: make ? 4200 : 6000 });
          tone({ freq: make ? 2400 : 3200, to: make ? 1700 : 2500, t, dur: 0.012, gain: make ? 0.06 : 0.03, release: 0.008 });
        },
        /* the shaft bottoming out on the gate */
        thock() {
          if (!ready()) return;
          const t = ctx!.currentTime;
          tone({ freq: 130, to: 60, t, dur: 0.06, gain: 0.14 });
          hit({ t, dur: 0.045, gain: 0.3, type: "lowpass", freq: 900 });
        },
        /* the return spring's twang on release */
        boing(strength = 1) {
          if (!ready() || strength < 0.2) return;
          const t = ctx!.currentTime;
          const o = tone({ type: "triangle", freq: 300, to: 150, t, dur: 0.24, gain: 0.12 * strength, release: 0.18 });
          const lfo = ctx!.createOscillator();
          const depth = ctx!.createGain();
          lfo.frequency.value = 22;
          depth.gain.setValueAtTime(40, t);
          depth.gain.exponentialRampToValueAtTime(1, t + 0.24);
          lfo.connect(depth).connect(o.frequency);
          lfo.start(t);
          lfo.stop(t + 0.28);
        },
        /* a soft tick as the ball is grabbed */
        tick() {
          if (!ready()) return;
          hit({ t: ctx!.currentTime, dur: 0.02, gain: 0.18, type: "bandpass", freq: 2500, q: 2 });
        },
        close: () => void ctx?.close().catch(() => {}),
      };
    })();
    muteRef.current = sfx.setMuted;
    cleanups.push(sfx.close);

    /* any gesture on the page counts; iOS only unlocks audio on touchend or click */
    (["pointerdown", "touchend", "click", "keydown"] as const).forEach((type) => {
      document.addEventListener(type, sfx.unlock, { capture: true, passive: true });
      cleanups.push(() => document.removeEventListener(type, sfx.unlock, { capture: true }));
    });

    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) {
      const id = ric(sfx.warm, { timeout: 2000 });
      cleanups.push(() => window.cancelIdleCallback?.(id));
    } else {
      const id = window.setTimeout(sfx.warm, 120);
      cleanups.push(() => clearTimeout(id));
    }

    /* ── haptics, best effort: vibrate on Android, the switch-input tap on iOS 18+, rumble on gamepads ── */
    const haptics = (() => {
      const ua = navigator.userAgent;
      const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const canVibrate = typeof navigator.vibrate === "function";
      let iosLabel: HTMLLabelElement | null = null;
      if (isIOS) {
        iosLabel = document.createElement("label");
        iosLabel.setAttribute("aria-hidden", "true");
        iosLabel.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("switch", "");
        input.tabIndex = -1;
        iosLabel.append(input);
        document.body.append(iosLabel);
        cleanups.push(() => iosLabel?.remove());
      }
      /* browsers ignore vibration until there has been a gesture */
      let unlocked = false;
      return {
        unlock() {
          unlocked = true;
        },
        pulse(ms = 10, power = 0.5) {
          if (!unlocked) return;
          try {
            if (canVibrate) navigator.vibrate(ms);
            else iosLabel?.click();
          } catch {
            /* unsupported — nothing to feel */
          }
          for (const pad of navigator.getGamepads?.() ?? []) {
            const actuator = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)
              ?.vibrationActuator;
            actuator
              ?.playEffect?.("dual-rumble", {
                duration: Math.max(ms, 20),
                strongMagnitude: power * 0.6,
                weakMagnitude: power,
              })
              .catch(() => {});
          }
        },
      };
    })();

    const unlock = () => {
      sfx.unlock();
      haptics.unlock();
    };

    /* ── the stick ── */
    const jx = motionValue(0);
    const jy = motionValue(0);
    const moveTo = (x: number, y: number, transition: typeof HOLD | typeof RETURN | typeof RETURN_REDUCED) => {
      animate(jx, x, transition);
      animate(jy, y, transition);
    };
    cleanups.push(() => {
      jx.stop();
      jy.stop();
      jx.destroy();
      jy.destroy();
    });

    /* ── rendering: whole art pixels, as large as the container allows ── */
    const renderer = createRenderer(canvas);
    let px = pixelRef.current;
    /* the stick plus four art pixels of air on each side, inside the parent's content box */
    function fit() {
      const parent = root.parentElement;
      let room = W * pixelRef.current;
      if (parent) {
        const cs = getComputedStyle(parent);
        room = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      }
      px = Math.max(2, Math.min(pixelRef.current, Math.floor(room / (W + 8))));
      root.style.setProperty("--pjoy-px", `${px}px`);
    }
    fitRef.current = fit;
    fit();
    if (root.parentElement && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(fit);
      ro.observe(root.parentElement);
      cleanups.push(() => ro.disconnect());
    }

    let drawQueued = 0;
    function requestDraw() {
      if (drawQueued) return;
      drawQueued = requestAnimationFrame(() => {
        drawQueued = 0;
        renderer.draw(jx.get(), jy.get());
      });
    }
    cleanups.push(() => cancelAnimationFrame(drawQueued));
    renderer.draw(0, 0);

    /* ── microswitches and the gate: sound, haptics and events ── */
    const sw: Record<JoystickDirection, boolean> = { up: false, down: false, left: false, right: false };
    let atGate = false;

    function check(key: JoystickDirection, travel: number) {
      if (!sw[key] && travel > ON) {
        sw[key] = true;
        sfx.click(true);
        haptics.pulse(9, 0.35);
        onSwitchRef.current?.(key, true);
      } else if (sw[key] && travel < OFF) {
        sw[key] = false;
        sfx.click(false);
        haptics.pulse(4, 0.15);
        onSwitchRef.current?.(key, false);
      }
    }

    function onStickChange() {
      requestDraw();
      const x = jx.get();
      const y = jy.get();
      check("right", x);
      check("left", -x);
      check("down", y);
      check("up", -y);
      onMoveRef.current?.(x, y);

      const r = Math.hypot(x, y);
      if (!atGate && r > 0.97) {
        atGate = true;
        sfx.thock();
        haptics.pulse(16, 0.8);
        if (!reduce) {
          animate(
            stage,
            { x: [0, (x / r) * px * 0.6, 0], y: [0, (y / r) * px * 0.6, 0] },
            { duration: 0.12, ease: "easeOut" },
          );
        }
      } else if (atGate && r < 0.85) {
        atGate = false;
      }
    }
    cleanups.push(jx.on("change", onStickChange), jy.on("change", onStickChange));

    function letGo() {
      const strength = Math.min(1, Math.hypot(jx.get(), jy.get()));
      moveTo(0, 0, reduce ? RETURN_REDUCED : RETURN);
      sfx.boing(strength);
      if (strength > 0.3) haptics.pulse(12, 0.4);
    }

    /* ── input: one source at a time ── */
    let source: "pointer" | "keys" | "pad" | null = null;

    /* pointer */
    let grabX = 0;
    let grabY = 0;
    let base: [number, number] = [0, 0];
    let pointerId = -1;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      unlock();
      if (source && source !== "pointer") return;
      source = "pointer";
      pointerId = e.pointerId;
      stage.setPointerCapture(e.pointerId);
      grabX = e.clientX;
      grabY = e.clientY;
      base = [jx.get(), jy.get()];
      sfx.tick();
      haptics.pulse(5, 0.1);
    };
    const onMovePointer = (e: PointerEvent) => {
      if (source !== "pointer" || e.pointerId !== pointerId) return;
      /* the ball travels about nine art pixels to the gate */
      const throwPx = 9 * px;
      const [x, y] = clampToGate(base[0] + (e.clientX - grabX) / throwPx, base[1] + (e.clientY - grabY) / throwPx);
      moveTo(x, y, HOLD);
    };
    const release = (e: PointerEvent) => {
      if (source !== "pointer" || e.pointerId !== pointerId) return;
      source = null;
      pointerId = -1;
      letGo();
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMovePointer);
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("lostpointercapture", release);
    cleanups.push(() => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMovePointer);
      stage.removeEventListener("pointerup", release);
      stage.removeEventListener("pointercancel", release);
      stage.removeEventListener("lostpointercapture", release);
    });

    /*
     * The focus ring is for keyboard users: the browser's own guess at
     * :focus-visible shows it after a grab too, so the last kind of input
     * decides instead.
     */
    const byKeys = () => (root.dataset.input = "keys");
    const byPointer = () => (root.dataset.input = "pointer");
    document.addEventListener("keydown", byKeys, { capture: true, passive: true });
    document.addEventListener("pointerdown", byPointer, { capture: true, passive: true });
    cleanups.push(() => {
      document.removeEventListener("keydown", byKeys, { capture: true });
      document.removeEventListener("pointerdown", byPointer, { capture: true });
    });

    /* keyboard — only while the stick has focus, so it never takes the page's arrow keys */
    const held = new Set<JoystickDirection>();
    function applyKeys() {
      const x = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
      const y = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
      if (x === 0 && y === 0) {
        if (source === "keys") {
          source = null;
          letGo();
        }
        return;
      }
      if (source && source !== "keys") return;
      source = "keys";
      const r = Math.hypot(x, y);
      moveTo(x / r, y / r, HOLD);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      unlock();
      if (e.repeat) return;
      held.add(dir);
      applyKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code];
      if (!dir) return;
      held.delete(dir);
      applyKeys();
    };
    const onBlur = () => {
      held.clear();
      applyKeys();
    };
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("keyup", onKeyUp);
    root.addEventListener("blur", onBlur);
    cleanups.push(() => {
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("keyup", onKeyUp);
      root.removeEventListener("blur", onBlur);
    });

    /* gamepad — polled only while one is connected */
    let padRaf = 0;
    let padActive = false;
    function pollPad() {
      padRaf = 0;
      const pad = [...(navigator.getGamepads?.() ?? [])].find(Boolean);
      if (!pad || !alive) return;
      const b = (i: number) => pad.buttons[i]?.pressed;
      let x = pad.axes[0] ?? 0;
      let y = pad.axes[1] ?? 0;
      if (b(12) || b(13) || b(14) || b(15)) {
        x = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
        y = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
      }
      if (Math.hypot(x, y) > 0.15) {
        if (!source || source === "pad") {
          source = "pad";
          padActive = true;
          moveTo(...clampToGate(x, y), HOLD);
        }
      } else if (padActive) {
        padActive = false;
        if (source === "pad") source = null;
        letGo();
      }
      padRaf = requestAnimationFrame(pollPad);
    }
    const startPad = () => {
      if (!padRaf) padRaf = requestAnimationFrame(pollPad);
    };
    window.addEventListener("gamepadconnected", startPad);
    if ([...(navigator.getGamepads?.() ?? [])].some(Boolean)) startPad();
    cleanups.push(() => {
      window.removeEventListener("gamepadconnected", startPad);
      cancelAnimationFrame(padRaf);
    });

    /* ── entrance ── */
    if (!reduce) {
      animate(stage, { opacity: [0, 1] }, { duration: 0.25 });
      animate(stage, { y: [-6 * px, 0] }, { type: "spring", stiffness: 420, damping: 14 });
    }

    if (autoFocus) root.focus({ preventScroll: true });

    return () => {
      alive = false;
      cleanups.forEach((fn) => fn());
    };
    // the engine is built once; props it needs later are read through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className="pjoy"
      data-theme={theme}
      tabIndex={0}
      role="application"
      aria-label="Arcade joystick. Drag the ball, or use the arrow keys."
    >
      <div ref={stageRef} className="pjoy__stage">
        <canvas ref={canvasRef} className="pjoy__canvas" width={W} height={H} />
      </div>
    </div>
  );
}
