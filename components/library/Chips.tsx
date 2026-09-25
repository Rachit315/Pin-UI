"use client";

import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import "./chips.css";

/* ------------------------------------------------------------------ props -- */

export type ChipsProps = {
  /** Chip radius, clamped to 0–40px. */
  corner?: number;
  /** How far the cast shadow is thrown, 0–100. */
  shadow?: number;
  /** Rows of four chips: 2, 3 or 4. */
  rows?: 2 | 3 | 4 | "2" | "3" | "4";
  /** "light" chips on paper, or "dark" chips on graphite. */
  theme?: "light" | "dark";
  /** Synthesised press, release, select and hover cues. */
  sound?: boolean;
  /** The chip selected on first render; `null` for none. */
  defaultValue?: string | null;
  /** Fired with the selected chip's id, or `null` once it is deselected. */
  onChange?: (value: string | null) => void;
};

/* ---------------------------------------------------------------- springs -- */

const SOFT = { type: "spring", stiffness: 420, damping: 30, mass: 0.7 } as const;
const SNAP = { type: "spring", stiffness: 900, damping: 26, mass: 0.5 } as const;
const POP = { type: "spring", stiffness: 700, damping: 18, mass: 0.6 } as const;
const ENTRY = { type: "spring", stiffness: 260, damping: 22, mass: 0.9 } as const;

/** How far a chip is still lifted while held down, in px. */
const DOWN = 1;
const PER_ROW = 4;

/* ------------------------------------------------------------------ sound -- */

/**
 * Synthesised, so nothing has to be downloaded. A click is a noise transient
 * through a bandpass (the plastic) plus a pitched body that drops fast (the
 * travel); that is what reads as tactile rather than as a beep. Kept quiet —
 * it should sit under the interaction.
 */
function useChipSound(enabled: boolean) {
  const engine = useRef<{ ctx: AudioContext; master: GainNode; noise: AudioBuffer } | null>(null);
  const on = useRef(enabled);
  on.current = enabled;
  const lastHover = useRef(0);

  const ensure = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!engine.current) {
      const AC =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.34;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.4);
      const noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      engine.current = { ctx, master, noise };
    }
    if (engine.current.ctx.state === "suspended") void engine.current.ctx.resume();
    return engine.current;
  }, []);

  useEffect(() => () => void engine.current?.ctx.close().catch(() => {}), []);

  const voice = useCallback(
    ({
      f = 200,
      f2 = 100,
      dur = 0.06,
      type = "triangle" as OscillatorType,
      g = 0.3,
      noise = 0.7,
      nf = 3000,
      q = 1.2,
      delay = 0,
    } = {}) => {
      if (!on.current) return;
      const e = ensure();
      if (!e) return;
      const { ctx, master } = e;
      const t0 = ctx.currentTime + delay;

      if (noise > 0) {
        const src = ctx.createBufferSource();
        src.buffer = e.noise;
        /* never twice the same */
        src.playbackRate.value = 0.8 + Math.random() * 0.5;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = nf;
        bp.Q.value = q;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.exponentialRampToValueAtTime(Math.max(0.001, noise * g), t0 + 0.003);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.8);
        src.connect(bp).connect(ng).connect(master);
        src.start(t0);
        src.stop(t0 + dur + 0.08);
      }

      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(Math.max(0.001, g), t0 + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(og).connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.08);
    },
    [ensure],
  );

  return useRef({
    unlock: () => {
      if (on.current) ensure();
    },
    /* a chip going down onto its edge */
    press: () => voice({ f: 240, f2: 110, dur: 0.055, g: 0.26, noise: 0.8, nf: 3100, q: 1.1 }),
    /* it coming back up — lighter, brighter */
    release: () => voice({ f: 330, f2: 220, dur: 0.034, g: 0.11, noise: 0.55, nf: 5400, q: 1.5 }),
    /* the chip that just became the selected one */
    select: () => {
      voice({ f: 250, f2: 105, dur: 0.06, g: 0.27, noise: 0.78, nf: 2900, q: 1.1 });
      voice({ f: 560, f2: 300, dur: 0.13, g: 0.08, noise: 0.12, nf: 2200, type: "sine", delay: 0.014 });
    },
    hover: () => {
      const now = performance.now();
      if (now - lastHover.current < 110) return;
      lastHover.current = now;
      voice({ f: 1500, f2: 1250, dur: 0.015, g: 0.018, noise: 0.35, nf: 7200, q: 3 });
    },
  }).current;
}

/* ------------------------------------------------------------------ icons -- */

const ICONS: Record<string, React.ReactNode> = {
  start: (
    <>
      <circle cx="5.5" cy="12" r="3" fill="#22c55e" />
      <path d="M10.5 7.6a1 1 0 0 1 1.5-.87l6.5 3.75a1.2 1.2 0 0 1 0 2.08l-6.5 3.75a1 1 0 0 1-1.5-.87V7.6Z" fill="#22c55e" />
    </>
  ),
  type: (
    <>
      <rect x="2" y="4.5" width="20" height="4" rx="2" fill="#f5d64e" />
      <rect x="2" y="10" width="12" height="4" rx="2" fill="#fbe795" />
      <rect x="2" y="15.5" width="17" height="4" rx="2" fill="#f5d64e" />
    </>
  ),
  layout: (
    <>
      <rect x="2" y="3" width="9" height="8" rx="2.4" fill="#f97316" />
      <rect x="13" y="3" width="9" height="8" rx="2.4" fill="#fdba74" />
      <rect x="2" y="13" width="20" height="8" rx="2.4" fill="#f97316" />
    </>
  ),
  color: (
    <>
      <path d="M12 2.4c4.3 4.2 7 7.3 7 10.7a7 7 0 1 1-14 0c0-3.4 2.7-6.5 7-10.7Z" fill="#fda4af" />
      <path d="M12 2.4c4.3 4.2 7 7.3 7 10.7a7 7 0 0 1-7 7V2.4Z" fill="#f43f5e" />
      <circle cx="12" cy="13.6" r="2" fill="#ffffff" fillOpacity=".7" />
    </>
  ),
  style: (
    <>
      <rect x="2.5" y="2.5" width="9" height="9" rx="3" fill="#e879f9" />
      <rect x="12.5" y="12.5" width="9" height="9" rx="3" fill="#d946ef" />
      <path d="M15.6 3.4a6.2 6.2 0 0 1 5 5M8.4 20.6a6.2 6.2 0 0 1-5-5" stroke="#f0abfc" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  imagery: (
    <>
      <path d="M8.6 8.8 15.8 20H1.4L8.6 8.8Z" fill="#a78bfa" />
      <path d="M15.2 5.2 22.6 20H8.8l6.4-14.8Z" fill="#7c3aed" />
      <circle cx="5.2" cy="5.4" r="2.4" fill="#c4b5fd" />
    </>
  ),
  elements: (
    <>
      <rect x="2.4" y="2.4" width="8.6" height="8.6" rx="2.4" fill="#3b9dfb" />
      <rect x="13" y="2.4" width="8.6" height="8.6" rx="2.4" fill="#9fcdfd" />
      <rect x="2.4" y="13" width="8.6" height="8.6" rx="2.4" fill="#9fcdfd" />
      <rect x="13" y="13" width="8.6" height="8.6" rx="2.4" fill="#3b9dfb" />
    </>
  ),
  tactics: (
    <>
      <path d="M6.4 1.8v15.8h15.8" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.8 6.4h15.8v15.8" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  motion: (
    <>
      <path d="M3 6h18" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" />
      <path d="M3 12h12" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" />
      <path d="M3 18h7" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  grid: (
    <>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4" stroke="#fb7185" strokeWidth="2.6" />
      <path d="M2.6 9.2h18.8M9.2 2.6v18.8" stroke="#fda4af" strokeWidth="2.6" />
    </>
  ),
  spacing: (
    <>
      <rect x="2.5" y="4" width="19" height="6" rx="2.4" fill="#34d399" />
      <rect x="2.5" y="14" width="19" height="6" rx="2.4" fill="#a7f3d0" />
    </>
  ),
  depth: (
    <>
      <rect x="2.4" y="2.4" width="13" height="13" rx="3.4" fill="#fcd34d" />
      <rect x="8.6" y="8.6" width="13" height="13" rx="3.4" fill="#f59e0b" />
    </>
  ),
  voice: (
    <>
      <rect x="2" y="9" width="3" height="6" rx="1.5" fill="#93c5fd" />
      <rect x="7" y="5" width="3" height="14" rx="1.5" fill="#2563eb" />
      <rect x="12" y="2.5" width="3" height="19" rx="1.5" fill="#93c5fd" />
      <rect x="17" y="7" width="3" height="10" rx="1.5" fill="#2563eb" />
    </>
  ),
  craft: (
    <path d="M12 2.4 14.9 9l7.1.6-5.4 4.7 1.6 6.9L12 17.5 5.8 21.2l1.6-6.9L2 9.6 9.1 9 12 2.4Z" fill="#f472b6" />
  ),
  flow: (
    <>
      <path d="M5 9v6a4 4 0 0 0 4 4h6" stroke="#7dd3fc" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="5" cy="5" r="3.2" fill="#38bdf8" />
      <circle cx="19" cy="19" r="3.2" fill="#0284c7" />
    </>
  ),
  ship: (
    <>
      <path d="M12 2c3.6 2.7 5.4 6.1 5.4 10.1L15.2 17.4H8.8L6.6 12.1C6.6 8.1 8.4 4.7 12 2Z" fill="#94a3b8" />
      <circle cx="12" cy="9.4" r="2.2" fill="#fff" />
      <path d="M9.4 18.6c1.1 1.9 1.8 2.9 2.6 3.4.8-.5 1.5-1.5 2.6-3.4H9.4Z" fill="#f97316" />
    </>
  ),
};

const ITEMS = [
  "Start", "Type", "Layout", "Color", "Style", "Imagery", "Elements", "Tactics",
  "Motion", "Grid", "Spacing", "Depth", "Voice", "Craft", "Flow", "Ship",
].map((label) => ({ id: label.toLowerCase(), label }));

/* -------------------------------------------------------------- component -- */

/**
 * A list of 3D chips with a real press.
 *
 * Each chip is extruded: its lip is a hard box-shadow `--lift` px deep, and
 * pressing it drives the chip down by exactly that much while the lip shrinks
 * to match — so it travels onto its own edge rather than just shrinking. The
 * soft ground shadow squashes as it goes down. The selected chip stays pressed
 * in, inverted, one pixel proud of the surface.
 *
 * Every transform is Motion's; React only owns which chip is selected.
 */
export default function Chips({
  corner = 20,
  shadow = 50,
  rows = 2,
  theme = "light",
  sound = true,
  defaultValue = "start",
  onChange,
}: ChipsProps) {
  const sfx = useChipSound(sound);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const [selected, setSelected] = useState<string | null>(defaultValue);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const rowCount = Math.min(4, Math.max(2, Number(rows) || 2));
  const visible = ITEMS.slice(0, rowCount * PER_ROW);

  /* the press travel, from the stylesheet — it is smaller at phone width */
  const edge = useCallback(() => {
    /* declared on the list, which is inside the container its size is queried from */
    const list = rootRef.current?.querySelector(".pchips__list");
    if (!list) return 7;
    return parseFloat(getComputedStyle(list).getPropertyValue("--pchips-edge")) || 7;
  }, []);

  const isOn = (el: HTMLElement) => el.dataset.selected === "true";
  const restY = useCallback((el: HTMLElement) => (isOn(el) ? edge() - DOWN : 0), [edge]);

  const depth = useCallback(
    (el: HTMLElement, px: number, transition: object = SNAP) => {
      const full = edge();
      animate(el, { y: full - px }, transition);
      el.style.setProperty("--lift", `${px}px`);
      const ground = el.querySelector<HTMLElement>(".pchips__ground");
      if (ground) {
        animate(
          ground,
          { opacity: 0.25 + (px / full) * 0.75, scaleX: 0.84 + (px / full) * 0.16 },
          { duration: 0.18 },
        );
      }
    },
    [edge],
  );

  /* every chip straight to its resting state, no animation */
  const settle = useCallback(() => {
    const full = edge();
    chipRefs.current.forEach((el) => {
      const on = isOn(el);
      animate(el, { y: on ? full - DOWN : 0, scale: 1, opacity: 1 }, { duration: 0 });
      el.style.setProperty("--lift", `${on ? DOWN : full}px`);
      const ground = el.querySelector<HTMLElement>(".pchips__ground");
      if (ground) animate(ground, { opacity: on ? 0.36 : 1, scaleX: on ? 0.86 : 1 }, { duration: 0 });
    });
  }, [edge]);

  /* entrance: the rows drop in, chip by chip — and again whenever the row count changes */
  useLayoutEffect(() => {
    settle();
    const chips = visible.map((item) => chipRefs.current.get(item.id)).filter(Boolean) as HTMLButtonElement[];
    chips.forEach((el, i) => {
      el.style.opacity = "0";
      animate(el, { opacity: [0, 1] }, { duration: 0.22, delay: i * 0.055, ease: "easeOut" });
      animate(el, { y: [restY(el) - 28, restY(el)], scale: [0.9, 1] }, { ...ENTRY, delay: i * 0.055 });
    });
    /* a hidden tab never runs those frames — never leave a chip stranded */
    const rescue = window.setTimeout(() => {
      chips.forEach((el) => {
        if (el.style.opacity === "0") el.style.opacity = "";
      });
    }, 1400);
    return () => window.clearTimeout(rescue);
    /* the entrance belongs to the row count, not to every render */
  }, [rowCount]);

  /* keep the press depth right when the chips change size */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let last = edge();
    const observer = new ResizeObserver(() => {
      const next = edge();
      if (next !== last) {
        last = next;
        settle();
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [edge, settle]);

  function select(id: string) {
    const prev = selectedRef.current;
    const next = prev === id ? null : id;
    selectedRef.current = next;
    setSelected(next);
    if (next) sfx.select();
    else sfx.release();

    chipRefs.current.forEach((el, chipId) => {
      const icon = el.querySelector<SVGElement>(".pchips__icon");
      /* written now rather than on the next render, so `depth` reads the new state */
      el.dataset.selected = String(chipId === next);
      if (chipId === next) {
        depth(el, DOWN);
        animate(el, { scale: [0.97, 1.02, 1] }, { duration: 0.34, ease: [0.2, 0.8, 0.2, 1] });
        if (icon) animate(icon, { rotate: [-14, 0], scale: [1.25, 1] }, SNAP);
      } else if (chipId === prev) {
        depth(el, edge(), POP);
        animate(el, { scale: 1 }, SOFT);
        if (icon) animate(icon, { rotate: 0, scale: 1 }, SOFT);
      }
    });

    onChange?.(next);
  }

  function wire(item: { id: string }) {
    const held = { current: false };
    const el = () => chipRefs.current.get(item.id);
    const icon = () => el()?.querySelector<SVGElement>(".pchips__icon") ?? null;
    const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

    return {
      onPointerEnter: () => {
        const chip = el();
        if (!chip || !canHover() || held.current || isOn(chip)) return;
        sfx.hover();
        animate(chip, { y: -3, scale: 1.015 }, SOFT);
        const i = icon();
        if (i) animate(i, { rotate: -7, scale: 1.14 }, SOFT);
      },
      onPointerLeave: () => {
        const chip = el();
        if (!chip || !canHover() || held.current || isOn(chip)) return;
        animate(chip, { y: 0, scale: 1 }, SOFT);
        const i = icon();
        if (i) animate(i, { rotate: 0, scale: 1 }, SOFT);
      },
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        const chip = el();
        if (!chip) return;
        sfx.unlock();
        held.current = true;
        try {
          chip.setPointerCapture(event.pointerId);
        } catch {
          /* capture is a nicety */
        }
        sfx.press();
        depth(chip, DOWN);
        animate(chip, { scale: 0.975 }, SNAP);
        const i = icon();
        if (i) animate(i, { rotate: 0, scale: 0.94 }, SNAP);
      },
      release: () => {
        const chip = el();
        if (!chip || !held.current) return;
        held.current = false;
        if (isOn(chip)) return;
        sfx.release();
        depth(chip, edge(), POP);
        animate(chip, { scale: 1 }, SOFT);
        const i = icon();
        if (i) animate(i, { scale: 1 }, SOFT);
      },
    };
  }

  /* the handlers hold a little per-chip state, so they are made once per chip */
  const handlers = useRef(new Map<string, ReturnType<typeof wire>>());
  const handlersFor = (item: { id: string }) => {
    let h = handlers.current.get(item.id);
    if (!h) {
      h = wire(item);
      handlers.current.set(item.id, h);
    }
    return h;
  };

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = visible[(index + step + visible.length) % visible.length];
    if (next) chipRefs.current.get(next.id)?.focus();
  }

  const v = Math.min(100, Math.max(0, shadow)) / 100;
  const style = {
    "--corner": `${Math.min(40, Math.max(0, corner))}px`,
    "--shade": (v * 2).toFixed(3),
    "--cast": (0.04 + v * 0.58).toFixed(3),
  } as React.CSSProperties;

  const lines: (typeof ITEMS)[] = [];
  for (let r = 0; r < rowCount; r += 1) lines.push(visible.slice(r * PER_ROW, r * PER_ROW + PER_ROW));

  return (
    <div ref={rootRef} className="pchips" data-theme={theme} style={style}>
      <div className="pchips__list" role="listbox" aria-label="Selection list">
        {lines.map((line, r) => (
          <div className="pchips__row" key={r}>
            {line.map((item) => {
              const index = visible.indexOf(item);
              const h = handlersFor(item);
              const on = selected === item.id;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    if (node) chipRefs.current.set(item.id, node);
                    else chipRefs.current.delete(item.id);
                  }}
                  className="pchips__chip"
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-selected={on}
                  onPointerEnter={h.onPointerEnter}
                  onPointerLeave={h.onPointerLeave}
                  onPointerDown={h.onPointerDown}
                  onPointerUp={h.release}
                  onPointerCancel={h.release}
                  onClick={() => select(item.id)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                >
                  <span className="pchips__ground" aria-hidden="true" />
                  <svg className="pchips__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {ICONS[item.id]}
                  </svg>
                  <span className="pchips__label">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
