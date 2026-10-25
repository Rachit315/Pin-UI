"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { animate, stagger, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import "./selection-list.css";

/**
 * Selection List — a single-choice list whose halves snap together like magnets.
 *
 * Each row is a coloured swatch with a dot and a grey label, held a few pixels
 * apart. Pick one and the two halves accelerate into each other, recoil a hair
 * on contact and settle; the label's colour wipes in from the left the moment
 * they touch, the swatch darkens and its dot pops back in the accent. Pick
 * another and the old one's colour wipes out through the right before its
 * halves spring apart. Hovering a row teases the halves a little closer.
 *
 * Rows take the arrow keys, Home and End; Escape clears the choice. On arrival
 * the rows slide in one after another and the first one fills.
 */

export type SelectionListItem = {
  label: string;
  /** The swatch, and the label's fill once picked. */
  accent: string;
  /** The dot at rest, and the swatch once picked. */
  dark: string;
  /** The label's text once picked. */
  activeText: string;
};

export type SelectionListProps = {
  theme?: "light" | "dark";
  items?: SelectionListItem[];
  /** Which row fills once the list has arrived; null leaves them all empty. */
  defaultValue?: number | null;
  /** Called with the picked row's index, or null when the choice is cleared. */
  onChange?: (index: number | null) => void;
  /** What the group is announced as. */
  label?: string;
};

const DEFAULT_ITEMS: SelectionListItem[] = [
  { label: "Chat", accent: "#ff5f00", dark: "#6e1526", activeText: "#fff4ec" },
  { label: "Questions", accent: "#f4a3ff", dark: "#6e1526", activeText: "#3b0a14" },
  { label: "Articles", accent: "#ffcc00", dark: "#3d2e05", activeText: "#231a02" },
  { label: "Communities", accent: "#85b02a", dark: "#1f3305", activeText: "#0f1a02" },
];

const IDLE_TEXT = "#111111";

/*
 * The magnet: the swatch and the label each travel half the gap (+0.5px of
 * overlap, so no hairline shows). They accelerate into each other, recoil a
 * hair on contact, then settle; letting go springs them apart.
 */
const GAP = 4;
const PULL = (GAP + 1) / 2;
const RECOIL = 0.5;
const SNAP = 0.32;
/* the moment the two halves touch */
const CONTACT = SNAP * 0.55;
/* hovering pulls the halves slightly together */
const TEASE = 0.75;

type Row = {
  on: boolean;
  fillAnim: AnimationPlaybackControls | null;
  /* the fill is clipped by two edges, left and right inset in % */
  clip: { l: number; r: number };
};

export default function SelectionList({
  theme = "light",
  items = DEFAULT_ITEMS,
  defaultValue = 0,
  onChange,
  label = "Content types",
}: SelectionListProps) {
  const reduced = useReducedMotion() ?? false;
  const [selected, setSelected] = useState<number | null>(null);
  const rowEls = useRef<(HTMLButtonElement | null)[]>([]);
  const rows = useRef<Row[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const t = <T extends object>(opts: T) => (reduced ? { duration: 0 } : opts);

  const parts = (i: number) => {
    const row = rowEls.current[i];
    if (!row) return null;
    return {
      row,
      swatch: row.querySelector<HTMLElement>(".psel__swatch")!,
      dot: row.querySelector<HTMLElement>(".psel__dot")!,
      label: row.querySelector<HTMLElement>(".psel__label")!,
      fill: row.querySelector<HTMLElement>(".psel__fill")!,
      text: row.querySelector<HTMLElement>(".psel__text")!,
    };
  };

  /* runs one row to picked or not: snap, then the fill and colours land on contact */
  const render = (i: number, on: boolean) => {
    const state = (rows.current[i] ??= { on: false, fillAnim: null, clip: { l: 0, r: 100 } });
    const el = parts(i);
    const item = items[i];
    if (!el || !item || state.on === on) return;
    state.on = on;

    const snapT = t({
      duration: SNAP,
      times: [0, 0.55, 0.75, 1],
      ease: [
        [0.55, 0, 1, 0.45],
        [0.22, 1, 0.36, 1],
        [0.45, 0, 0.55, 1],
      ] as [number, number, number, number][],
    });
    const releaseT = t({ type: "spring" as const, stiffness: 520, damping: 19, delay: 0.12 });
    const colorT = t({ duration: 0.26, ease: [0.22, 1, 0.36, 1] as const });
    const popT = t({ type: "spring" as const, stiffness: 600, damping: 18 });
    const fillT = t({ duration: 0.4, ease: [0.32, 0.72, 0, 1] as const });

    /* selecting snaps the halves together first; deselecting lets the fill leave, then springs them apart */
    if (on) {
      animate(el.swatch, { x: [null, PULL, PULL - RECOIL, PULL] }, snapT);
      animate(el.label, { x: [null, -PULL, -PULL + RECOIL, -PULL] }, snapT);
    } else {
      animate(el.swatch, { x: 0 }, releaseT);
      animate(el.label, { x: 0 }, releaseT);
    }
    const lead = on && !reduced ? CONTACT : 0;

    /* selecting wipes in from the left, deselecting wipes out through the right; an interruption reverses from where the edges are */
    if (on && state.clip.l >= 100) state.clip = { l: 0, r: 100 };
    const from = { ...state.clip };
    const to = on ? { l: 0, r: 0 } : { l: 100, r: 0 };
    state.fillAnim?.stop();
    state.fillAnim = animate(0, 1, {
      ...fillT,
      delay: lead,
      onUpdate: (p) => {
        state.clip = { l: from.l + (to.l - from.l) * p, r: from.r + (to.r - from.r) * p };
        el.fill.style.clipPath = `inset(0% ${state.clip.r}% 0% ${state.clip.l}%)`;
      },
    });

    animate(el.text, { color: on ? item.activeText : IDLE_TEXT }, { ...colorT, delay: lead });
    animate(el.swatch, { backgroundColor: on ? item.dark : item.accent }, { ...colorT, delay: lead });
    animate(el.dot, { backgroundColor: on ? item.accent : item.dark }, { ...colorT, delay: lead });
    animate(el.dot, { scale: on ? [0.3, 1] : [0.7, 1] }, on ? { ...popT, delay: lead } : popT);
  };

  /* every change of choice plays out on the rows themselves */
  useEffect(() => {
    items.forEach((_, i) => render(i, i === selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /* entrance: the rows slide in one after another, then the default fills */
  useEffect(() => {
    const els = rowEls.current.filter((r): r is HTMLButtonElement => !!r);
    const swatches = els.map((r) => r.querySelector<HTMLElement>(".psel__swatch")!);
    const delay = stagger(0.06, { startDelay: 0.1 });
    const a = animate(els, { opacity: [0, 1], x: [-14, 0] }, t({ type: "spring" as const, stiffness: 300, damping: 26, delay }));
    const b = animate(swatches, { scale: [0.4, 1] }, t({ type: "spring" as const, stiffness: 420, damping: 20, delay }));
    const timer =
      defaultValue == null
        ? 0
        : window.setTimeout(() => setSelected(defaultValue), reduced ? 0 : 100 + els.length * 60 + 220);
    return () => {
      a.stop();
      b.stop();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (i: number) => {
    const next = selected === i ? null : i;
    setSelected(next);
    onChangeRef.current?.(next);
  };

  const clear = () => {
    if (selected === null) return;
    setSelected(null);
    onChangeRef.current?.(null);
  };

  const softT = t({ type: "spring" as const, stiffness: 500, damping: 32 });
  const popT = t({ type: "spring" as const, stiffness: 600, damping: 18 });
  const teaseT = t({ type: "spring" as const, stiffness: 380, damping: 24 });

  const onEnter = (i: number) => {
    const el = parts(i);
    if (!el) return;
    animate(el.row, { x: 2 }, softT);
    if (!rows.current[i]?.on) {
      animate(el.dot, { scale: 1.2 }, popT);
      animate(el.swatch, { x: TEASE }, teaseT);
      animate(el.label, { x: -TEASE }, teaseT);
      el.label.classList.add("psel__label--hover");
    }
  };

  const onLeave = (i: number) => {
    const el = parts(i);
    if (!el) return;
    animate(el.row, { x: 0, scale: 1 }, softT);
    animate(el.dot, { scale: 1 }, popT);
    if (!rows.current[i]?.on) {
      animate(el.swatch, { x: 0 }, teaseT);
      animate(el.label, { x: 0 }, teaseT);
    }
    el.label.classList.remove("psel__label--hover");
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (step) {
      e.preventDefault();
      rowEls.current[(i + step + n) % n]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      rowEls.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      rowEls.current[n - 1]?.focus();
    } else if (e.key === "Escape") {
      clear();
    }
  };

  return (
    <div className="psel" data-theme={theme}>
      <div className="psel__list" role="group" aria-label={label}>
        {items.map((item, i) => (
          <button
            key={item.label}
            ref={(el) => {
              rowEls.current[i] = el;
            }}
            type="button"
            className="psel__row"
            aria-pressed={selected === i}
            onClick={() => pick(i)}
            onPointerEnter={() => onEnter(i)}
            onPointerLeave={() => onLeave(i)}
            onPointerDown={() => {
              const row = rowEls.current[i];
              if (row) animate(row, { scale: 0.97 }, softT);
            }}
            onPointerUp={() => {
              const row = rowEls.current[i];
              if (row) animate(row, { scale: 1 }, softT);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="psel__swatch" style={{ background: item.accent }}>
              <span className="psel__dot" style={{ background: item.dark }} />
            </span>
            <span className="psel__label">
              <span className="psel__fill" style={{ background: item.accent }} />
              <span className="psel__text" style={{ color: IDLE_TEXT }}>
                {item.label}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
