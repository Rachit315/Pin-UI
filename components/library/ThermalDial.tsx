"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { animate, mix, motionValue, stagger, transform } from "motion/react";
import "./thermal-dial.css";

/**
 * Thermal Dial — a temperature card you set by turning its dial.
 *
 * Grab the card and drag round the ring: the reading follows on a hand-rolled
 * spring that overshoots and settles, the lit ticks carry a slow travelling
 * wave with a brighter comet at their head, and the heat at the foot of the
 * card rises and breathes with the number — cold blue through amber to a
 * summer red. The digits roll one slot at a time, and the season above them
 * swaps letter by letter through a blur.
 *
 * Drag, scroll, or focus it and use the arrow keys (Shift for fives, Home and
 * End for the ends of the scale).
 */

export type ThermalDialProps = {
  /** The reading it settles on after its opening sweep. */
  defaultValue?: number;
  min?: number;
  max?: number;
  /** How wide the card is drawn, in px; it never exceeds 80% of the viewport. */
  size?: number;
  theme?: "light" | "dark";
  /** A line under the card saying how to use it. */
  hint?: boolean;
  /** Fired when the reading is set, with the season it falls in. */
  onChange?: (value: number, season: string) => void;
};

const N = 96; // ticks
const A0 = -115; // sweep, degrees from 12 o'clock, clockwise
const A1 = 115;
const GAP_HALF = (360 - (A1 - A0)) / 2;
const CX = 220; // dial geometry in the 440 × 458 card space
const CY = 322;
const R = 166;
const NEEDLE_TOP = CY - R - 16;
const NEEDLE_LEN = 100;
const SVGNS = "http://www.w3.org/2000/svg";

const seasonFor = (v: number) => (v < 5 ? "Winter" : v < 16 ? "Autumn" : v < 26 ? "Spring" : "Summer");

/* the heat palette: cold blue → amber → summer red, by absolute temperature */
const stops = [-9, 8, 22, 38, 70];
const c1 = transform(stops, ["#1d4ed8", "#0e7490", "#c2410c", "#e01e0b", "#b3071f"]);
const c2 = transform(stops, ["#3b82f6", "#22d3ee", "#f59e0b", "#ff6410", "#ff3d1a"]);
const c3 = transform(stops, ["#bfdbfe", "#a5f3fc", "#fde68a", "#ffc24a", "#ffb347"]);

export default function ThermalDial({
  defaultValue = 38,
  min = -9,
  max = 70,
  size = 340,
  theme = "dark",
  hint = true,
  onChange,
}: ThermalDialProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ticksRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const seasonRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  /* read live inside the engine, so changing them never rebuilds it */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const glowK = useRef(theme === "light" ? 0.5 : 1);
  useEffect(() => {
    glowK.current = theme === "light" ? 0.5 : 1;
  }, [theme]);

  useEffect(() => {
    const root = rootRef.current!;
    const card = cardRef.current!;
    const dial = svgRef.current!;
    const ticksG = ticksRef.current!;
    const needle = needleRef.current!;
    const wash = washRef.current!;
    const bloom = bloomRef.current!;
    const halo = haloRef.current!;
    const seasonEl = seasonRef.current!;
    const leadDigit = leadRef.current!;
    const mainDigit = mainRef.current!;
    const hintEl = hintRef.current;

    const MIN = min;
    const MAX = max;
    const START = Math.min(MAX, Math.max(MIN, defaultValue));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    const cleanups: (() => void)[] = [];

    const clamp = (v: number, a = MIN, b = MAX) => Math.min(b, Math.max(a, v));
    const toAngle = (v: number) => A0 + ((v - MIN) / (MAX - MIN)) * (A1 - A0);

    /* ── the tick ring ── */
    ticksG.replaceChildren();
    const ticks: { el: SVGLineElement; tf: number; edge: number; len: number; op: string }[] = [];
    for (let i = 0; i < N; i++) {
      const tf = i / (N - 1);
      const a = A0 + tf * (A1 - A0);
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("x1", String(CX));
      line.setAttribute("x2", String(CX));
      line.setAttribute("y1", String(CY - R));
      line.setAttribute("stroke-width", "1.2");
      line.setAttribute("transform", `rotate(${a.toFixed(2)} ${CX} ${CY})`);
      ticksG.appendChild(line);
      /* both ends of the arc dissolve into the heat */
      const edge = 1 - Math.pow(Math.abs(a) / 120, 4);
      ticks.push({ el: line, tf, edge, len: -1, op: "" });
    }

    /* ── digits: each slot rolls on its own ── */
    let shownInt: number | null = null;
    function roll(el: HTMLElement, ch: string, dir: number) {
      if (el.textContent === ch) return;
      el.textContent = ch;
      if (reduce || !dir) return;
      animate(el, { y: [dir * 22, 0] }, { type: "spring", stiffness: 600, damping: 34 });
      animate(el, { opacity: [0.35, 1], filter: ["blur(5px)", "blur(0px)"] }, { duration: 0.24, ease: "easeOut" });
    }
    function setDigits(n: number, dir: number) {
      const s = String(Math.abs(n));
      const lead = (n < 0 ? "−" : "") + s.slice(0, -1); // everything but the last digit
      roll(leadDigit, lead, dir);
      roll(mainDigit, s[s.length - 1], dir);
    }

    /* ── the season: letters stagger in and out through a blur ── */
    let seasonName: string | null = null;
    let seasonTimer: ReturnType<typeof setTimeout> | undefined;
    const OUT_MS = 160;
    function letters(word: string) {
      seasonEl.replaceChildren(
        ...[...word].map((ch) => Object.assign(document.createElement("span"), { textContent: ch })),
      );
      return seasonEl.querySelectorAll("span");
    }
    function lettersIn(word: string) {
      const fresh = letters(word);
      if (reduce) return;
      animate(fresh, { y: [14, 0], scale: [0.9, 1] }, { type: "spring", stiffness: 420, damping: 26, delay: stagger(0.03) });
      animate(fresh, { opacity: [0, 1], filter: ["blur(8px)", "blur(0px)"] }, { duration: 0.35, delay: stagger(0.03), ease: "easeOut" });
    }
    /*
     * Timers, not awaited promises: an interrupted animation never resolves,
     * which could leave the label blank or stale. Sweeping past several
     * seasons quickly settles into a single swap to the last one.
     */
    function setSeason(name: string) {
      if (name === seasonName) return;
      const first = seasonName === null;
      seasonName = name;
      clearTimeout(seasonTimer);
      if (first || reduce) return lettersIn(name);
      const old = seasonEl.querySelectorAll("span");
      animate(old, { y: -10, opacity: 0, filter: "blur(6px)" }, { duration: OUT_MS / 1000, delay: stagger(0.015), ease: "easeIn" });
      seasonTimer = setTimeout(() => {
        if (alive && seasonName === name) lettersIn(name);
      }, OUT_MS + old.length * 15);
    }
    cleanups.push(() => clearTimeout(seasonTimer));

    /* ── the reading: a hand-rolled spring, and a free-running wave clock ── */
    let target = reduce ? START : MIN;
    let cur = target;
    let vel = 0;
    let wave = 0;
    let lastColorAt: number | null = null;
    const glowIn = motionValue(reduce ? 1 : 0); // the bloom's intro fade

    function render() {
      const f = clamp((cur - MIN) / (MAX - MIN), 0, 1);

      if (lastColorAt === null || Math.abs(cur - lastColorAt) > 0.05) {
        root.style.setProperty("--pdial-c1", c1(cur));
        root.style.setProperty("--pdial-c2", c2(cur));
        root.style.setProperty("--pdial-c3", c3(cur));
        lastColorAt = cur;
      }

      /* the band: lit ticks are longer, carry the wave, and brighten toward the head */
      const amp = reduce ? 0 : 0.8 + f * 1.6;
      for (let i = 0; i < N; i++) {
        const tk = ticks[i];
        const on = tk.tf <= f + 0.001;
        const behind = f - tk.tf;
        const comet = on && behind < 0.12 ? (1 - behind / 0.12) * 7 : 0;
        const undulate = on ? Math.sin(wave + i * 0.5) * amp : 0;
        const len = (on ? 12 : 9) + comet + undulate;
        const op = ((on ? 0.42 + (1 - clamp(behind * 2.2, 0, 1)) * 0.58 : 0.26) * tk.edge).toFixed(3);
        if (Math.abs(len - tk.len) > 0.04) {
          tk.el.setAttribute("y2", (CY - R - len).toFixed(2));
          tk.len = len;
        }
        if (op !== tk.op) {
          tk.el.setAttribute("stroke-opacity", op);
          tk.op = op;
        }
      }

      needle.setAttribute("transform", `rotate(${toAngle(cur).toFixed(2)} ${CX} ${CY})`);

      /* heat rises and breathes with the reading */
      const breathe = reduce ? 1 : 1 + Math.sin(wave * 0.5) * 0.015;
      wash.style.transform = `scaleY(${(mix(0.62, 1.05, f) * breathe).toFixed(4)})`;
      const g = glowIn.get() * glowK.current;
      bloom.style.opacity = (g * mix(0.4, 0.95, f) * breathe).toFixed(3);
      halo.style.opacity = (g * mix(0.2, 0.6, f)).toFixed(3);

      const r = Math.round(cur);
      if (r !== shownInt) {
        const dir = shownInt === null ? 0 : Math.sign(r - shownInt);
        shownInt = r;
        setDigits(r, dir);
        const name = seasonFor(r);
        setSeason(name);
        card.setAttribute("aria-valuenow", String(r));
        card.setAttribute("aria-valuetext", `${r} degrees, ${name}`);
      }
    }

    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      /*
       * Real elapsed time in 60fps frames, integrated in small steps, so a
       * throttled or busy tab still lands on time instead of in slow motion.
       */
      let frames = Math.min(60, (now - last) / 16.67);
      last = now;
      wave += frames * 0.055;
      if (reduce) {
        cur = target;
      } else {
        const k = 0.16; // stiffness
        const d = 0.76; // damping
        while (frames > 0) {
          const dt = Math.min(1, frames);
          frames -= dt;
          vel += (target - cur) * k * dt;
          vel *= Math.pow(d, dt);
          cur += vel * dt;
        }
        if (Math.abs(target - cur) < 0.02 && Math.abs(vel) < 0.02) {
          cur = target;
          vel = 0;
        }
      }
      render();
      raf = requestAnimationFrame(tick);
    }
    cleanups.push(() => cancelAnimationFrame(raf));

    let reported = START;
    const setTarget = (v: number) => {
      target = clamp(Math.round(v));
      if (target !== reported) {
        reported = target;
        onChangeRef.current?.(target, seasonFor(target));
      }
    };

    /* ── the intro: the card arrives, and the reading sweeps up from the bottom ── */
    let introTimer: ReturnType<typeof setTimeout> | undefined;
    function intro() {
      if (!alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
      if (reduce) {
        card.style.opacity = "1";
        if (hintEl) hintEl.style.opacity = "1";
        return;
      }
      animate(card, { scale: [0.88, 1], y: [36, 0] }, { type: "spring", stiffness: 140, damping: 18 });
      animate(card, { opacity: [0, 1], filter: ["blur(18px)", "blur(0px)"] }, { duration: 0.65, ease: "easeOut" });
      animate(ticks.map((t) => t.el), { opacity: [0, 1] }, { duration: 0.3, delay: stagger(0.006, { startDelay: 0.2, from: "center" }) });
      animate(needle, { opacity: [0, 1] }, { duration: 0.4, delay: 0.45 });
      animate(glowIn, 1, { duration: 1.4, delay: 0.3, ease: "easeOut" });
      if (hintEl) animate(hintEl, { opacity: [0, 1], y: [6, 0] }, { duration: 0.6, delay: 1.4, ease: "easeOut" });
      introTimer = setTimeout(() => {
        if (alive) target = START;
      }, 380);
    }
    cleanups.push(() => clearTimeout(introTimer));
    /* the faces first, capped, so a slow font never holds it back */
    void Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(intro);

    /* ── drag round the ring ── */
    let dragging = false;
    function valueFromPointer(e: PointerEvent) {
      const b = dial.getBoundingClientRect();
      const x = ((e.clientX - b.left) / b.width) * 440 - CX;
      const y = ((e.clientY - b.top) / b.height) * 458 - CY;
      let a = (Math.atan2(x, -y) * 180) / Math.PI; // 0 = up, clockwise positive
      if (a > A1) a = a < A1 + GAP_HALF ? A1 : A0; // snap across the gap
      if (a < A0) a = a > A0 - GAP_HALF ? A0 : A1;
      return MIN + ((a - A0) / (A1 - A0)) * (MAX - MIN);
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true;
      card.dataset.dragging = "true";
      card.setPointerCapture(e.pointerId);
      setTarget(valueFromPointer(e));
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) setTarget(valueFromPointer(e));
    };
    const release = () => {
      if (!dragging) return;
      dragging = false;
      card.dataset.dragging = "false";
    };
    /* wheel and keys step whole degrees */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setTarget(target - Math.sign(e.deltaY));
    };
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      const map: Record<string, number> = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step };
      if (e.key in map) setTarget(target + map[e.key]);
      else if (e.key === "Home") setTarget(MIN);
      else if (e.key === "End") setTarget(MAX);
      else return;
      e.preventDefault();
    };
    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
    card.addEventListener("wheel", onWheel, { passive: false });
    card.addEventListener("keydown", onKey);
    cleanups.push(() => {
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", release);
      card.removeEventListener("pointercancel", release);
      card.removeEventListener("wheel", onWheel);
      card.removeEventListener("keydown", onKey);
    });

    return () => {
      alive = false;
      cleanups.forEach((fn) => fn());
    };
    // the engine is built once per range; everything else is read through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  return (
    <div
      ref={rootRef}
      className="pdial"
      data-theme={theme}
      style={{ "--pdial-w": `min(${size}px, 80vw)` } as React.CSSProperties}
    >
      <div className="pdial__wrap">
        <div ref={haloRef} className="pdial__halo" aria-hidden="true" />
        <div ref={bloomRef} className="pdial__bloom" aria-hidden="true" />

        <div
          ref={cardRef}
          className="pdial__card"
          tabIndex={0}
          role="slider"
          aria-label="Temperature"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={defaultValue}
          aria-valuetext={`${defaultValue} degrees, ${seasonFor(defaultValue)}`}
        >
          <div className="pdial__clip">
            <div ref={washRef} className="pdial__wash" />
            <div className="pdial__walls" />
          </div>
          <div className="pdial__rim" />

          {/* the dial: ticks and needle, in the same 440 × 458 space as the card */}
          <svg ref={svgRef} className="pdial__dial" viewBox="0 0 440 458" aria-hidden="true">
            <defs>
              <linearGradient id="pdial-needle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--pdial-ink)" }} stopOpacity="1" />
                <stop offset="1" style={{ stopColor: "var(--pdial-ink)" }} stopOpacity=".12" />
              </linearGradient>
            </defs>
            <g ref={ticksRef} className="pdial__ticks" strokeLinecap="round" />
            <g ref={needleRef} className="pdial__needle">
              <rect x={CX - 0.9} y={NEEDLE_TOP} width="1.8" height={NEEDLE_LEN} rx=".9" fill="url(#pdial-needle)" />
            </g>
          </svg>

          <h3 ref={seasonRef} className="pdial__season" aria-hidden="true" />

          <div className="pdial__value" aria-hidden="true">
            <div className="pdial__num">
              <span className="pdial__slot pdial__lead">
                <span ref={leadRef} />
              </span>
              <span className="pdial__slot pdial__main">
                <span ref={mainRef} />
                <i className="pdial__degree" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {hint && (
        <p ref={hintRef} className="pdial__hint">
          Drag around the dial to set the temperature
        </p>
      )}
    </div>
  );
}
