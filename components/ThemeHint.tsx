"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePinTheme } from "@/lib/theme";
import "./theme-hint.css";

/**
 * A pencilled note beside the logo: "switch theme", and a scribbled arrow that
 * arcs over the wordmark and lands on the mark — because the mark is the
 * switch, and nothing about a logo says so.
 *
 * It is drawn against the real lockup rather than a guess at it: it reads
 * where the mark and the wordmark actually are in their shared box and lays
 * the arrow out in those pixels, again whenever the lockup changes size. So
 * the arrow lands on the mark in the hero, in a header bar and in the sidebar
 * alike, at any width.
 *
 * The arrow draws itself in and the words write on after it; then the arrow
 * keeps rocking gently on its tail, a note that is still being pointed at.
 * Each switch of the theme draws it again, and it rocks quicker while the
 * mark is under the pointer. It is decoration — `aria-hidden`, no pointer
 * events — the button it points at already says what it does.
 */

type Geometry = {
  /* text box */
  tx: number;
  ty: number;
  fs: number;
  /* arrow */
  d: string;
  head: string;
  ox: number;
  oy: number;
};

export default function ThemeHint({
  mark,
  word,
  under = false,
}: {
  mark: string;
  word: string;
  /**
   * Route the arrow beneath the lockup rather than over it — for a lockup that
   * sits right under the edge of something that clips, like the hero's frame,
   * where an arc over the top is cut off by the frame's own edge.
   */
  under?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [g, setG] = useState<Geometry | null>(null);
  const { turns } = usePinTheme();

  useLayoutEffect(() => {
    const self = ref.current;
    const host = self?.parentElement;
    if (!self || !host) return;

    const layout = () => {
      const m = host.querySelector(mark)?.getBoundingClientRect();
      const w = host.querySelector(word)?.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      if (!m || !w || !m.width || !w.width) return;

      /* everything in the host's own pixels */
      const M = { l: m.left - h.left, t: m.top - h.top, r: m.right - h.left, b: m.bottom - h.top };
      const W = { l: w.left - h.left, t: w.top - h.top, r: w.right - h.left, b: w.bottom - h.top };
      const fs = Math.max(15, Math.min(24, (W.b - W.t) * 0.62));

      /* the note sits just past the wordmark, a little below its middle */
      const tx = W.r + fs * 0.75;
      const ty = (W.t + W.b) / 2 - fs * 0.1;

      /* +1 draws the arc over the lockup, −1 beneath it */
      const dir = under ? -1 : 1;

      /*
       * The tail leaves from just beside the note's first letters — above them
       * for an arc over the top, below them for one underneath — clear of the
       * wordmark, so it never reads as one more letter after it. The head lands
       * on the mark's top right or bottom right.
       */
      const sx = tx + fs * 0.25;
      const sy = ty - dir * fs * 0.62;
      const ex = M.l + (M.r - M.l) * 0.74;
      const ey = under ? M.b + fs * 0.08 : M.t - fs * 0.08;
      /*
       * How far the arc bows out from the lockup: its natural depth where there
       * is room, and only as much as there is where the lockup sits close to
       * the top of the screen, as it does in a header bar.
       */
      const room = under ? Infinity : h.top + Math.min(M.t, W.t) - 3;
      const rise = Math.min(fs * 0.85, Math.max(fs * 0.3, room));
      const peak = under ? Math.max(M.b, W.b) + rise : Math.min(M.t, W.t) - rise;
      const mid = (W.l + W.r) / 2;

      /*
       * A hand's stroke, not a geometric one: a short lift off the page, a long
       * arc past the wordmark that leans a touch beyond its middle, and a turn
       * onto the mark that steepens at the end like a flick of the wrist.
       */
      const d = [
        `M ${sx} ${sy}`,
        `C ${sx - fs * 0.1} ${peak + dir * rise * 0.55} ${mid + fs * 1.3} ${peak} ${mid} ${peak}`,
        `S ${ex + fs * 0.55} ${ey - dir * rise * 0.75} ${ex} ${ey}`,
      ].join(" ");

      /* the head: two short strokes splayed about the direction of arrival */
      const ax = ex + fs * 0.55;
      const ay = ey - dir * rise * 0.75;
      const ang = Math.atan2(ey - ay, ex - ax);
      const len = fs * 0.5;
      const spread = 0.55;
      const p1 = [ex - len * Math.cos(ang - spread), ey - len * Math.sin(ang - spread)];
      const p2 = [ex - len * Math.cos(ang + spread), ey - len * Math.sin(ang + spread)];
      const head = `M ${p1[0]} ${p1[1]} L ${ex} ${ey} L ${p2[0]} ${p2[1]}`;

      setG({ tx, ty, fs, d, head, ox: sx, oy: sy });
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(host);
    void document.fonts?.ready.then(layout);
    /*
     * The mark can arrive on a shared-layout flight, and a page can still be
     * settling its fonts and entrances; measure again as it does.
     */
    const timers = [250, 700, 1500, 3000].map((ms) => window.setTimeout(layout, ms));
    window.addEventListener("load", layout);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", layout);
    };
  }, [mark, word, under]);

  return (
    <span className="thint" ref={ref} aria-hidden="true">
      {g && (
        /* keyed on the theme's turns, so every switch draws it again */
        <span className="thint__draw" key={turns} data-replay={turns > 0 || undefined}>
          <svg className="thint__svg" width="1" height="1">
            <g className="thint__rock" style={{ transformOrigin: `${g.ox}px ${g.oy}px` }}>
              <path className="thint__line" d={g.d} pathLength={1} />
              <path className="thint__head" d={g.head} pathLength={1} />
            </g>
          </svg>
          <span
            className="thint__text"
            style={{ left: g.tx, top: g.ty, fontSize: g.fs }}
          >
            switch theme
          </span>
        </span>
      )}
    </span>
  );
}
