"use client";

import { useEffect, useId, useRef } from "react";
import { animate } from "motion/react";
import "./lamp-switch.css";

/**
 * Lamp Switch — a ceramic pendant lamp on a cord, and a liquid switch.
 *
 * The lamp drops in from the ceiling under plain gravity; on landing, the
 * fall's momentum is handed to the cord — a damped spring for the stretch and
 * a damped pendulum for the swing — so the overshoot, swing and settle read as
 * one motion, and then the light switches itself on, flickering as the bulb
 * warms. Grab the shade to swing it; pull it down past the detent and it
 * clicks the light like a pull-chain, mid-pull. The switch's knob is a blob
 * with a trailing drop merged by a goo filter: tap it, or drag it — it tracks
 * the pointer, rubber-bands past the ends, and lands on whichever side a flick
 * would carry it to.
 */

export type LampSwitchProps = {
  /** Switch the light on by itself once the lamp has landed. */
  autoOn?: boolean;
  theme?: "light" | "dark";
  /** The card's size in px at most; it shrinks to fit a narrow container. */
  size?: number;
  /** Fired whenever the light turns on or off. */
  onToggle?: (on: boolean) => void;
};

const CARD = 412;
const KNOB_ON = 232 - 90;
const KNOB_OFF = 0;
const NS = "http://www.w3.org/2000/svg";

/* the hanging lamp: a drop under gravity, then a cord spring and a pendulum */
const PHYS = {
  dropFrom: -330, // px above rest
  dropDelay: 0.4, // s
  dropTime: 0.6, // s
  absorb: 0.38, // the share of the landing speed the cord keeps
  cordK: 230, // cord stiffness
  cordC: 7, // cord damping
  swingK: 9, // pendulum stiffness (ω²)
  swingC: 1.35, // pendulum damping
};
const PIVOT_Y = -0.6 * CARD; // matches the lamp's transform-origin
const PULL_DETENT = 38;
const DRAG_SLOP = 4;

/* the switch's colours, per theme: knob fill and icon, on and off */
const SWITCH = {
  dark: { fillOn: "#858279", fillOff: "#4b4945", iconOn: "#ecebe7", iconOff: "#8f8c86" },
  light: { fillOn: "#fbfaf7", fillOff: "#d9d4cb", iconOn: "#e0a43a", iconOff: "#8d877d" },
};

export default function LampSwitch({ autoOn = true, theme = "dark", size = 354, onToggle }: LampSwitchProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `plamp-${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<SVGGElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<SVGEllipseElement>(null);
  const bulbOnRef = useRef<SVGCircleElement>(null);
  const bulbOffRef = useRef<SVGCircleElement>(null);
  const rimRef = useRef<SVGPathElement>(null);
  const rimOffRef = useRef<SVGPathElement>(null);
  const dimRef = useRef<SVGGElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const trackLightRef = useRef<HTMLSpanElement>(null);
  const labelOnRef = useRef<HTMLSpanElement>(null);
  const labelOffRef = useRef<HTMLSpanElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  /* read live inside the engine, so changing them never rebuilds it */
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  const sizeRef = useRef(size);
  const themeRef = useRef(theme);
  const repaintRef = useRef<() => void>(() => {});
  const fitRef = useRef<() => void>(() => {});
  useEffect(() => {
    themeRef.current = theme;
    repaintRef.current();
  }, [theme]);
  useEffect(() => {
    sizeRef.current = size;
    fitRef.current();
  }, [size]);

  useEffect(() => {
    const root = rootRef.current!;
    const stage = stageRef.current!;
    const card = cardRef.current!;
    const ringGroup = ringsRef.current!;
    const ambient = ambientRef.current!;
    const lamp = lampRef.current!;
    const beam = beamRef.current!;
    const halo = haloRef.current!;
    const bulbOn = bulbOnRef.current!;
    const bulbOff = bulbOffRef.current!;
    const rim = rimRef.current!;
    const rimOff = rimOffRef.current!;
    const shadeDim = dimRef.current!;
    const lampGrab = grabRef.current!;
    const sw = switchRef.current!;
    const trackLight = trackLightRef.current!;
    const labelOn = labelOnRef.current!;
    const labelOff = labelOffRef.current!;
    const tail = tailRef.current!;
    const knob = knobRef.current!;
    const face = faceRef.current!;
    const icon = iconRef.current!;
    const fills = [tail, knob];

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    const cleanups: (() => void)[] = [];
    const d = (s: number) => (reduced ? 0 : s);
    const instant = { duration: 0 };

    /* ── the concentric arcs behind the lamp ── */
    ringGroup.replaceChildren();
    for (let r = 170; r <= 760; r += 11) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", "206");
      c.setAttribute("cy", "-140");
      c.setAttribute("r", String(r));
      ringGroup.appendChild(c);
    }

    /* ── size: never larger than asked, and it fits its container ── */
    let scale = sizeRef.current / CARD; // pointer deltas are divided by this to get card units
    function fit() {
      const parent = root.parentElement;
      let room = Infinity;
      if (parent) {
        const cs = getComputedStyle(parent);
        room = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      }
      scale = Math.max(0.4, Math.min(sizeRef.current, room) / CARD);
      root.style.setProperty("--plamp-scale", String(scale));
    }
    fitRef.current = fit;
    fit();
    if (root.parentElement && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(fit);
      ro.observe(root.parentElement);
      cleanups.push(() => ro.disconnect());
    }

    /* ── the hanging lamp's physics; the loop sleeps once everything is at rest ── */
    const body = { y: 0, vy: 0, th: 0, vth: 0 };
    let phase: "wait" | "fall" | "hang" = "hang";
    let phaseT = 0;
    let raf = 0;
    let running = false;
    let prevT = 0;
    let onLand: (() => void) | null = null;
    let held = false; // the pointer is holding the lamp: physics pauses, the pointer drives it

    function render() {
      lamp.style.transform = `translateY(${body.y.toFixed(2)}px) rotate(${body.th.toFixed(3)}deg)`;
    }

    function integrate(dt: number) {
      /* semi-implicit Euler: the cord's spring (stretch) and the pendulum (swing) */
      body.vy += (-PHYS.cordK * body.y - PHYS.cordC * body.vy) * dt;
      body.y += body.vy * dt;
      body.vth += (-PHYS.swingK * body.th - PHYS.swingC * body.vth) * dt;
      body.th += body.vth * dt;
    }

    function step(now: number) {
      if (held || !alive) {
        running = false;
        return;
      }
      /* real elapsed time, capped, in small sub-steps: the same at 30, 60 or 144fps */
      const elapsed = prevT ? Math.min(0.1, (now - prevT) / 1000) : 1 / 60;
      prevT = now;

      if (phase === "wait" || phase === "fall") {
        phaseT += elapsed;
        const t = phaseT - PHYS.dropDelay;
        if (t >= 0) {
          phase = "fall";
          lamp.style.opacity = "1";
        }
        const g = (-2 * PHYS.dropFrom) / PHYS.dropTime ** 2;
        if (t >= PHYS.dropTime) {
          phase = "hang";
          body.y = 0;
          body.vy = g * PHYS.dropTime * PHYS.absorb;
          body.vth = -13; // a slight sideways kick, so it swings as it lands
          onLand?.();
          onLand = null;
          /* spend the rest of this frame on the cord */
          for (let left = t - PHYS.dropTime; left > 0; left -= 1 / 240) integrate(Math.min(left, 1 / 240));
        } else if (t >= 0) {
          body.y = PHYS.dropFrom + 0.5 * g * t * t;
        }
      } else {
        const n = Math.ceil(elapsed / (1 / 240));
        for (let i = 0; i < n; i++) integrate(elapsed / n);
      }

      render();

      const resting =
        phase === "hang" &&
        Math.abs(body.y) < 0.05 &&
        Math.abs(body.vy) < 0.5 &&
        Math.abs(body.th) < 0.01 &&
        Math.abs(body.vth) < 0.05;
      if (resting) {
        body.y = body.vy = body.th = body.vth = 0;
        render();
        running = false;
        return;
      }
      raf = requestAnimationFrame(step);
    }
    cleanups.push(() => cancelAnimationFrame(raf));

    function wake() {
      if (running || !alive) return;
      running = true;
      prevT = 0;
      raf = requestAnimationFrame(step);
    }

    function nudge(vth: number, vy = 0) {
      if (reduced) return;
      body.vth += vth;
      body.vy += vy;
      wake();
    }

    /* ── the switch and the light ── */
    const knobSpring = reduced ? instant : ({ type: "spring", stiffness: 420, damping: 30, mass: 0.9 } as const);
    /* the trailing drop is looser, so it stretches behind the knob — the liquid feel */
    const tailSpring = reduced ? instant : ({ type: "spring", stiffness: 170, damping: 17, mass: 1 } as const);

    let on = false;
    const colours = () => SWITCH[themeRef.current];
    function paintSwitch(t: { duration: number }) {
      const c = colours();
      fills.forEach((el) => animate(el, { backgroundColor: on ? c.fillOn : c.fillOff }, t));
      animate(icon, { color: on ? c.iconOn : c.iconOff }, t);
    }
    repaintRef.current = () => paintSwitch({ duration: d(0.35) });

    function lightOn() {
      /* a flicker as the bulb warms up */
      const flicker = { duration: d(0.75), times: [0, 0.12, 0.22, 0.36, 0.5, 1], ease: "easeOut" as const };
      animate(beam, { opacity: [0, 0.7, 0.15, 0.9, 0.45, 1] }, flicker);
      animate(halo, { opacity: [0, 0.8, 0.2, 0.9, 0.5, 0.9] }, flicker);
      animate(bulbOn, { opacity: [0, 1, 0.3, 1, 0.7, 1] }, flicker);
      animate(rim, { opacity: [0, 1, 0.3, 1, 0.7, 1] }, flicker);
      animate(bulbOff, { opacity: 0 }, { duration: d(0.3) });
      animate(rimOff, { opacity: 0 }, { duration: d(0.3) });
      animate(shadeDim, { opacity: 0 }, { duration: d(0.5) });
      animate(ambient, { opacity: 1 }, { duration: d(0.8), delay: d(0.1) });
      animate(trackLight, { opacity: 1 }, { duration: d(0.6), delay: d(0.1) });
      animate(ringGroup, { opacity: 0.1 }, { duration: d(0.8) });
    }

    function lightOff(now = false) {
      const t = now ? instant : ({ duration: d(0.28), ease: "easeIn" } as const);
      animate(beam, { opacity: 0 }, t);
      animate(halo, { opacity: 0 }, t);
      animate(bulbOn, { opacity: 0 }, t);
      animate(rim, { opacity: 0 }, t);
      animate(bulbOff, { opacity: 1 }, t);
      animate(rimOff, { opacity: 1 }, t);
      animate(shadeDim, { opacity: 0.42 }, now ? t : { duration: d(0.45) });
      animate(ambient, { opacity: 0 }, t);
      animate(trackLight, { opacity: 0 }, t);
      animate(ringGroup, { opacity: 0.035 }, now ? t : { duration: d(0.5) });
    }

    /* labels: a blurred cross-fade, sliding away from the knob */
    function settleLabels(state: boolean, dir: number) {
      const incoming = state ? labelOn : labelOff;
      const outgoing = state ? labelOff : labelOn;
      animate(outgoing, { opacity: 0, x: dir * 14, filter: "blur(6px)" }, { duration: d(0.22), ease: "easeIn" });
      animate(incoming, { opacity: 1, x: 0, filter: "blur(0px)" }, { duration: d(0.4), delay: d(0.12), ease: [0.22, 1, 0.36, 1] });
    }

    function toggle() {
      on = !on;
      sw.setAttribute("aria-checked", String(on));
      const x = on ? KNOB_ON : KNOB_OFF;
      const dir = on ? 1 : -1;

      /* the liquid knob: the blob springs, the drop trails behind, the goo merges them */
      animate(knob, { x }, knobSpring);
      animate(face, { x }, knobSpring);
      animate(tail, { x }, tailSpring);
      if (!reduced) {
        animate(knob, { scaleX: [null, 1.18, 0.94, 1.03, 1], scaleY: [null, 0.88, 1.05, 0.98, 1] }, { duration: 0.6, ease: "easeOut" });
        animate(tail, { scale: [1, 0.78, 0.9, 1] }, { duration: 0.7, ease: "easeOut" });
        animate(icon, { rotate: [null, dir * 90, 0], scale: [1, 0.82, 1] }, { duration: 0.55, ease: "easeInOut" });
      }
      paintSwitch({ duration: d(0.35) });
      settleLabels(on, dir);

      /* flicking the switch tugs the cord: the lamp bobs and swings */
      nudge(dir * 9, 70);

      if (on) lightOn();
      else lightOff();
      onToggleRef.current?.(on);
    }

    /* the starting state: light off, switch off */
    animate(knob, { x: KNOB_OFF }, instant);
    animate(tail, { x: KNOB_OFF }, instant);
    animate(face, { x: KNOB_OFF }, instant);
    animate(labelOn, { opacity: 0, x: -14, filter: "blur(6px)" }, instant);
    paintSwitch(instant);
    sw.setAttribute("aria-checked", "false");
    lightOff(true);

    let auto = autoOn; // it switches itself on after the drop, unless someone got there first
    function userToggle() {
      auto = false;
      toggle();
    }

    const rubber = (x: number, max: number) => max * (1 - Math.exp(-x / max)); // a soft limit toward max
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    /* ── the switch: tap it, or drag the liquid knob ── */
    type SwDrag = { id: number; startX: number; base: number; x: number; moved: boolean; lastX: number; lastT: number; v: number };
    let swDrag: SwDrag | null = null;
    let suppressClick = false;

    const knobLimit = (x: number) =>
      x < KNOB_OFF ? KNOB_OFF - rubber(KNOB_OFF - x, 14) : x > KNOB_ON ? KNOB_ON + rubber(x - KNOB_ON, 14) : x;

    function scrubLabels(p: number) {
      animate(labelOn, { opacity: p, x: -14 * (1 - p), filter: `blur(${6 * (1 - p)}px)` }, instant);
      animate(labelOff, { opacity: 1 - p, x: 14 * p, filter: `blur(${6 * p}px)` }, instant);
    }

    const onSwDown = (e: PointerEvent) => {
      if (e.button !== 0 || swDrag) return;
      const base = on ? KNOB_ON : KNOB_OFF;
      swDrag = { id: e.pointerId, startX: e.clientX, base, x: base, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
      sw.setPointerCapture(e.pointerId);
      animate(sw, { scale: 0.97 }, { type: "spring", stiffness: 600, damping: 30 });
    };

    const onSwMove = (e: PointerEvent) => {
      if (!swDrag || e.pointerId !== swDrag.id) return;
      const dx = (e.clientX - swDrag.startX) / scale;
      if (!swDrag.moved) {
        if (Math.abs(dx) < DRAG_SLOP) return;
        swDrag.moved = true;
        sw.classList.add("is-dragging");
        animate(sw, { scale: 1 }, { type: "spring", stiffness: 500, damping: 22 });
        animate(face, { scale: 1.06 }, { type: "spring", stiffness: 500, damping: 22 });
      }

      /* velocity in card px/s, lightly smoothed */
      const dt = Math.max(1, e.timeStamp - swDrag.lastT) / 1000;
      const inst = (e.clientX - swDrag.lastX) / scale / dt;
      swDrag.v = swDrag.v * 0.6 + inst * 0.4;
      swDrag.lastX = e.clientX;
      swDrag.lastT = e.timeStamp;

      const x = knobLimit(swDrag.base + dx);
      swDrag.x = x;
      animate(knob, { x }, instant);
      animate(face, { x }, instant);
      animate(tail, { x }, tailSpring); // it lags behind: the liquid stretch

      /* squash and stretch with speed */
      const stretch = Math.min(Math.abs(swDrag.v) / 2600, 0.2);
      animate(knob, { scaleX: 1 + stretch, scaleY: 1 - stretch * 0.5 }, { duration: 0.08 });

      scrubLabels(clamp(x / KNOB_ON, 0, 1));
      animate(icon, { rotate: ((x - swDrag.base) / KNOB_ON) * 120 }, instant);
    };

    function endSwitchDrag(e: PointerEvent, cancelled = false) {
      if (!swDrag || e.pointerId !== swDrag.id) return;
      const drag = swDrag;
      swDrag = null;
      sw.classList.remove("is-dragging");
      animate(sw, { scale: 1 }, { type: "spring", stiffness: 500, damping: 18 });
      if (!drag.moved) return; // a plain tap: the click handler toggles

      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      animate(face, { scale: 1 }, { type: "spring", stiffness: 500, damping: 20 });

      /* where a flick would land, and so which side it settles on */
      const projected = drag.x + clamp(drag.v, -2000, 2000) * 0.12;
      const next = cancelled ? on : projected > KNOB_ON / 2;
      if (next !== on) {
        userToggle();
      } else {
        const x = on ? KNOB_ON : KNOB_OFF;
        animate(knob, { x }, knobSpring);
        animate(face, { x }, knobSpring);
        animate(tail, { x }, tailSpring);
        animate(knob, { scaleX: 1, scaleY: 1 }, { type: "spring", stiffness: 500, damping: 15 });
        animate(icon, { rotate: 0 }, { type: "spring", stiffness: 300, damping: 18 });
        settleLabels(on, on ? 1 : -1);
      }
    }
    const onSwUp = (e: PointerEvent) => endSwitchDrag(e);
    const onSwCancel = (e: PointerEvent) => endSwitchDrag(e, true);
    const onSwClick = () => {
      if (suppressClick) return;
      userToggle();
    };
    sw.addEventListener("pointerdown", onSwDown);
    sw.addEventListener("pointermove", onSwMove);
    sw.addEventListener("pointerup", onSwUp);
    sw.addEventListener("pointercancel", onSwCancel);
    sw.addEventListener("click", onSwClick);
    cleanups.push(() => {
      sw.removeEventListener("pointerdown", onSwDown);
      sw.removeEventListener("pointermove", onSwMove);
      sw.removeEventListener("pointerup", onSwUp);
      sw.removeEventListener("pointercancel", onSwCancel);
      sw.removeEventListener("click", onSwClick);
    });

    /* ── the lamp: grab it, swing it, pull it ──
       Holding the shade pauses the physics and maps the pointer onto the
       pendulum — sideways is the swing round the ceiling pivot, vertical is
       the cord's stretch, both rubber-banded. Letting go hands the throw back
       to the physics. Pulling past the detent clicks the light, once per
       pull, mid-pull rather than on release. */
    type LampDrag = { id: number; sx: number; sy: number; y0: number; th0: number; arm: number; pulled: boolean; lastT: number; lastY: number; lastTh: number; vy: number; vth: number };
    let lampDrag: LampDrag | null = null;

    const onLampDown = (e: PointerEvent) => {
      if (e.button !== 0 || phase !== "hang" || lampDrag) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const localY = (e.clientY - r.top) / scale - body.y;
      lampDrag = {
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        y0: body.y,
        th0: body.th,
        arm: Math.max(120, localY - PIVOT_Y), // from the pivot to the grab point
        pulled: false,
        lastT: e.timeStamp,
        lastY: body.y,
        lastTh: body.th,
        vy: 0,
        vth: 0,
      };
      held = true;
      lampGrab.setPointerCapture(e.pointerId);
      root.classList.add("is-grabbing");
    };

    const onLampMove = (e: PointerEvent) => {
      if (!lampDrag || e.pointerId !== lampDrag.id) return;
      const dx = (e.clientX - lampDrag.sx) / scale;
      const dy = (e.clientY - lampDrag.sy) / scale;

      const rawY = lampDrag.y0 + dy;
      body.y = rawY >= 0 ? rubber(rawY, 70) : -rubber(-rawY, 26);
      /* the pivot is above the lamp, so dragging right is a counter-clockwise angle */
      const rawTh = lampDrag.th0 - (Math.atan2(dx, lampDrag.arm + body.y) * 180) / Math.PI;
      body.th = Math.sign(rawTh) * rubber(Math.abs(rawTh), 18);
      render();

      const dt = Math.max(1, e.timeStamp - lampDrag.lastT) / 1000;
      lampDrag.vy = lampDrag.vy * 0.5 + ((body.y - lampDrag.lastY) / dt) * 0.5;
      lampDrag.vth = lampDrag.vth * 0.5 + ((body.th - lampDrag.lastTh) / dt) * 0.5;
      lampDrag.lastY = body.y;
      lampDrag.lastTh = body.th;
      lampDrag.lastT = e.timeStamp;

      if (!lampDrag.pulled && body.y >= PULL_DETENT) {
        lampDrag.pulled = true;
        navigator.vibrate?.(8);
        userToggle();
      }
    };

    const endLampDrag = (e: PointerEvent) => {
      if (!lampDrag || e.pointerId !== lampDrag.id) return;
      /* a stale sample — the pointer held still before letting go — means no throw */
      const still = e.timeStamp - lampDrag.lastT > 80;
      body.vy = still ? 0 : clamp(lampDrag.vy, -700, 700);
      body.vth = still ? 0 : clamp(lampDrag.vth, -55, 55);
      lampDrag = null;
      held = false;
      root.classList.remove("is-grabbing");
      wake();
    };
    lampGrab.addEventListener("pointerdown", onLampDown);
    lampGrab.addEventListener("pointermove", onLampMove);
    lampGrab.addEventListener("pointerup", endLampDrag);
    lampGrab.addEventListener("pointercancel", endLampDrag);
    cleanups.push(() => {
      lampGrab.removeEventListener("pointerdown", onLampDown);
      lampGrab.removeEventListener("pointermove", onLampMove);
      lampGrab.removeEventListener("pointerup", endLampDrag);
      lampGrab.removeEventListener("pointercancel", endLampDrag);
    });

    /* ── the entrance: the lamp drops in, then the light switches itself on ── */
    let autoTimer: ReturnType<typeof setTimeout> | undefined;
    if (reduced) {
      render();
      if (auto) toggle();
    } else {
      lamp.style.opacity = "0";
      body.y = PHYS.dropFrom;
      render();
      phase = "wait";
      phaseT = 0;
      onLand = () => {
        autoTimer = setTimeout(() => {
          if (alive && auto && !on) toggle();
        }, 450);
      };
      wake();
    }
    cleanups.push(() => clearTimeout(autoTimer));

    stage.dataset.ready = "true";

    return () => {
      alive = false;
      cleanups.forEach((fn) => fn());
    };
    // the engine is built once; everything it needs later is read through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="plamp" data-theme={theme}>
      <svg className="plamp__defs" aria-hidden="true">
        <defs>
          {/* the liquid knob's goo */}
          <filter id={id("goo")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div ref={stageRef} className="plamp__stage">
        <div ref={cardRef} className="plamp__card">
          {/* concentric arcs */}
          <svg className="plamp__rings" viewBox="0 0 412 412" aria-hidden="true">
            <defs>
              <radialGradient id={id("ringFade")} cx="206" cy="250" r="260" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
              </radialGradient>
              <mask id={id("ringMask")}>
                <rect width="412" height="412" fill={url("ringFade")} />
              </mask>
            </defs>
            <g ref={ringsRef} className="plamp__ringGroup" mask={url("ringMask")} fill="none" strokeWidth="0.7" />
          </svg>

          {/* the warm glow the light casts on the card */}
          <div ref={ambientRef} className="plamp__ambient" />

          {/* the lamp: it hangs from the ceiling, drops in, and swings on its cord */}
          <div ref={lampRef} className="plamp__lamp">
            <svg ref={beamRef} className="plamp__beam" viewBox="0 0 412 412" aria-hidden="true">
              <defs>
                <linearGradient id={id("beamGrad")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff4dc" stopOpacity="0.62" />
                  <stop offset="0.5" stopColor="#efe3c6" stopOpacity="0.26" />
                  <stop offset="1" stopColor="#efe3c6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={id("beamCore")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fffaf0" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#fffaf0" stopOpacity="0" />
                </linearGradient>
                <filter id={id("beamBlur")} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              <path d="M138 192 L274 192 L312 306 L100 306 Z" fill={url("beamGrad")} filter={url("beamBlur")} />
              <path d="M164 194 L248 194 L268 262 L144 262 Z" fill={url("beamCore")} filter={url("beamBlur")} />
            </svg>

            <svg className="plamp__fixture" viewBox="0 0 412 412" aria-hidden="true">
              <defs>
                <linearGradient id={id("wood")} x1="0" x2="1">
                  <stop offset="0" stopColor="#a7713f" />
                  <stop offset="0.28" stopColor="#e0b887" />
                  <stop offset="0.55" stopColor="#d9ab76" />
                  <stop offset="0.85" stopColor="#b47c47" />
                  <stop offset="1" stopColor="#8f5c30" />
                </linearGradient>
                {/* the cord fades into the ceiling: the card's own colour at the top */}
                <linearGradient id={id("woodFade")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: "var(--plamp-ceiling)" }} stopOpacity="1" />
                  <stop offset="1" style={{ stopColor: "var(--plamp-ceiling)" }} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={id("shadeGrad")} x1="0" x2="1">
                  <stop offset="0" stopColor="#d6d2cb" />
                  <stop offset="0.22" stopColor="#efece7" />
                  <stop offset="0.5" stopColor="#f5f3ef" />
                  <stop offset="0.78" stopColor="#e3e0da" />
                  <stop offset="1" stopColor="#b9b4ac" />
                </linearGradient>
                <linearGradient id={id("shadeVert")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#000" stopOpacity="0.12" />
                  <stop offset="0.35" stopColor="#000" stopOpacity="0" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id={id("lipTop")} x1="0" x2="1">
                  <stop offset="0" stopColor="#c9c5be" />
                  <stop offset="0.4" stopColor="#fbfaf7" />
                  <stop offset="1" stopColor="#bcb7af" />
                </linearGradient>
                <linearGradient id={id("lipBottom")} x1="0" x2="1">
                  <stop offset="0" stopColor="#cdc9c2" />
                  <stop offset="0.45" stopColor="#ebe8e3" />
                  <stop offset="1" stopColor="#aaa59d" />
                </linearGradient>
                <radialGradient id={id("bulb")} cx="0.5" cy="0.35" r="0.65">
                  <stop offset="0" stopColor="#fffef6" />
                  <stop offset="0.55" stopColor="#fbf0cf" />
                  <stop offset="1" stopColor="#e5d3a2" />
                </radialGradient>
                <radialGradient id={id("bulbOff")} cx="0.5" cy="0.35" r="0.65">
                  <stop offset="0" stopColor="#6a675f" />
                  <stop offset="1" stopColor="#36342f" />
                </radialGradient>
                <linearGradient id={id("rimGlow")} x1="0" x2="1">
                  <stop offset="0" stopColor="#d9cfb9" />
                  <stop offset="0.5" stopColor="#fff8e6" />
                  <stop offset="1" stopColor="#d4c9b2" />
                </linearGradient>
                <filter id={id("softer")} x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="12" />
                </filter>
                {/* matte ceramic grain */}
                <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
                  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0" result="g" />
                  <feComposite in="g" in2="SourceGraphic" operator="in" />
                </filter>
                {/* the lamp's shapes, reused by the dimming overlay when it is off */}
                <path id={id("pStem")} d="M191 -340 L221 -340 L221 59 L191 59 Z" />
                <path id={id("pLipTop")} d="M191 57 L221 57 L253 68.5 L159 68.5 Z" />
                <path id={id("pLipBottom")} d="M159 68.5 L253 68.5 L237 88 L175 88 Z" />
                <path id={id("pShade")} d="M175 87.5 L237 87.5 L291 186 Q206 192 121 186 Z" />
              </defs>

              {/* the stem; the cord above it fades into the ceiling */}
              <use href={`#${id("pStem")}`} fill={url("wood")} />
              <rect x="190" y="-340" width="32" height="340" fill={url("woodFade")} />

              {/* the bulb, glowing under the shade */}
              <ellipse ref={haloRef} cx="206" cy="196" rx="46" ry="22" fill="#fff0c8" opacity="0.9" filter={url("softer")} />
              <circle ref={bulbOnRef} cx="206" cy="191" r="21" fill={url("bulb")} />
              <circle ref={bulbOffRef} cx="206" cy="191" r="21" fill={url("bulbOff")} opacity="0" />

              {/* the bow-tie collar */}
              <use href={`#${id("pLipTop")}`} fill={url("lipTop")} />
              <use href={`#${id("pLipBottom")}`} fill={url("lipBottom")} />
              <path d="M159.5 68.5 L252.5 68.5" stroke="#fff" strokeOpacity="0.75" strokeWidth="0.8" />

              {/* the shade */}
              <use href={`#${id("pShade")}`} fill={url("shadeGrad")} />
              <use href={`#${id("pShade")}`} fill={url("shadeVert")} />
              <use href={`#${id("pShade")}`} fill="#000" filter={url("grain")} />
              <use href={`#${id("pLipBottom")}`} fill="#000" filter={url("grain")} />

              {/* the inside of the shade, lit by the bulb */}
              <path ref={rimRef} d="M121 186 Q206 179 291 186 Q206 192 121 186 Z" fill={url("rimGlow")} />
              <path ref={rimOffRef} d="M121 186 Q206 179 291 186 Q206 192 121 186 Z" fill="#5f5c57" opacity="0" />

              {/* dims the whole fixture while the light is off */}
              <g ref={dimRef} className="plamp__dim" opacity="0">
                <use href={`#${id("pStem")}`} />
                <use href={`#${id("pLipTop")}`} />
                <use href={`#${id("pLipBottom")}`} />
                <use href={`#${id("pShade")}`} />
              </g>
            </svg>

            {/* the grab area over the shade: drag to swing, pull down to click the light */}
            <div ref={grabRef} className="plamp__grab" aria-hidden="true" />
          </div>

          {/* the switch */}
          <button ref={switchRef} type="button" role="switch" aria-checked="false" aria-label="Lamp" className="plamp__switch">
            <span ref={trackLightRef} className="plamp__trackLight" />
            <span ref={labelOnRef} className="plamp__label plamp__label--on">
              On
            </span>
            <span ref={labelOffRef} className="plamp__label plamp__label--off">
              Off
            </span>

            {/* the liquid knob: a blob and its trailing drop, merged by the goo */}
            <span className="plamp__goo" style={{ filter: url("goo") }}>
              <span ref={tailRef} className="plamp__fill" />
              <span ref={knobRef} className="plamp__fill" />
            </span>

            {/* the icon rides on top of the knob */}
            <span ref={faceRef} className="plamp__face">
              <span className="plamp__sheen" />
              <svg ref={iconRef} className="plamp__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v10" />
                <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
