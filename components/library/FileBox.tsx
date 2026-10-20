"use client";

import { useEffect, useId, useRef } from "react";
import { animate, frame, motionValue, type MotionValue, type ValueAnimationTransition } from "motion/react";
import "./file-box.css";

/**
 * File Box — a cardboard file box holding five colourful folders.
 *
 * The box is drawn in an oblique projection as one SVG: a hollow back, the
 * folders standing in it back to front, then the front and side faces over
 * them, so a lifted folder rises out of the box rather than through it. Each
 * folder is a back panel with its tab, three sheets of paper and a front flap.
 *
 * Hover (or focus) a folder and it is pulled up by its tab, leaning a hair
 * toward that side; the flap falls open a beat later and the sheets trail
 * behind on looser springs, while its neighbours give way a little. Click,
 * Enter or Space gives it a tug. Every transform channel is a Motion value, so
 * sweeping across the folders hands one target to the next with its velocity
 * intact instead of restarting from rest. The scene tilts a few degrees with
 * the pointer and the shadow answers it.
 *
 * Colours are theme tokens registered as typed custom properties, so a theme
 * change cross-fades every face, folder and shadow at once — and the box gives
 * a little under the new light.
 */

export type FileBoxColor = "green" | "beige" | "pink" | "orange";

export type FileBoxProps = {
  theme?: "light" | "dark";
  /** Fill the container edge to edge, with the box centred in the largest square that fits. */
  fill?: boolean;
  /** Called when a folder is tugged, with its colour and its place counted from the front (1–5). */
  onPull?: (folder: { color: FileBoxColor; position: number }) => void;
};

/* ── geometry ──
   Oblique projection: u runs along the box front (0‥185), d runs into the box
   (0‥1), h is height above the floor. */
const K = 45 / 185; // slope of the front edge
const H = 117; // box height
const TU = 8; // wall thickness, along u
const TD = 0.06; // wall thickness, along d
const P = (u: number, d: number, h: number): [number, number] => [210 + u + 130 * d, 455 + K * u - 78 * d - h];
/* a folder's own plane: local x = u, y = -h */
const plane = (d: number) => `matrix(1 ${K} 0 1 ${210 + 130 * d} ${455 - 78 * d})`;
const poly = (...pts: [number, number][]) => "M" + pts.map((p) => p.map((n) => n.toFixed(2)).join(" ")).join(" L") + " Z";

type Folder = { d: number; x0: number; x1: number; h: number; tab: [number, number]; c: FileBoxColor };

/* back → front */
const FOLDERS: Folder[] = [
  { d: 0.85, x0: 14, x1: 176, h: 150, tab: [122, 44], c: "green" },
  { d: 0.7, x0: 12, x1: 172, h: 150, tab: [56, 46], c: "beige" },
  { d: 0.5, x0: 10, x1: 168, h: 150, tab: [92, 48], c: "pink" },
  { d: 0.3, x0: 8, x1: 172, h: 148, tab: [50, 46], c: "orange" },
  { d: 0.14, x0: 8, x1: 170, h: 146, tab: [8, 44], c: "green" },
];
const ORDINAL = ["front", "second", "middle", "fourth", "back"];
const TAB_H = 13;
const FLAP = 27; // how far the front flap sits below the back panel
const LIFT = 40;
const PAPER_TILT = [0.8, -1.4, 0.5];
const PAPER_FAN = [-2.6, 0.8, 2.8];

/* the back panel with its tab; `bottom` lets a hit area start at the box rim, `up` extends it upward */
function backPath({ x0, x1, h, tab: [tx, tw] }: Folder, bottom = 0, up = 0) {
  const r = 5;
  const t = h + TAB_H;
  const b = -bottom - up;
  const hh = -h - up;
  const tt = -t - up;
  const tabEnd = tx + tw;
  let d = `M${x0} ${b} `;
  d +=
    tx <= x0
      ? `V${tt + r} Q${x0} ${tt} ${x0 + r} ${tt} `
      : `V${hh + r} Q${x0} ${hh} ${x0 + r} ${hh} H${tx} C${tx + 5} ${hh} ${tx + 4} ${tt} ${tx + 11} ${tt} `;
  d += `H${tabEnd - 11} C${tabEnd - 4} ${tt} ${tabEnd - 5} ${hh} ${tabEnd} ${hh} `;
  d += `H${x1 - r} Q${x1} ${hh} ${x1} ${hh + r} V${b} Z`;
  return d;
}
const roundTop = (x0: number, x1: number, top: number, r = 5) =>
  `M${x0} 0 V${-top + r} Q${x0} ${-top} ${x0 + r} ${-top} H${x1 - r} Q${x1} ${-top} ${x1} ${-top + r} V0 Z`;

/* ── motion ── */
const EASE = [0.22, 1, 0.36, 1] as const;
const SOFT = { type: "spring", stiffness: 190, damping: 24, mass: 1 } as const;
const HOVER = {
  /* a heavy, critically damped lift: it eases out of the box with no bounce */
  lift: { type: "spring", stiffness: 150, damping: 25, mass: 1.1 },
  /* dropping back has a touch of weight to it */
  drop: { type: "spring", stiffness: 210, damping: 20, mass: 1.1 },
  /* the flap swings on its fold, a beat after the folder moves */
  flap: { type: "spring", stiffness: 120, damping: 17, mass: 1 },
  /* loose sheets: light and slightly underdamped, so they trail and settle */
  paper: { type: "spring", stiffness: 110, damping: 12, mass: 0.8 },
  nudge: { type: "spring", stiffness: 170, damping: 22, mass: 1 },
} as const;

type Channel = "x" | "y" | "rotate" | "scale" | "sy" | "opacity";
const DEFAULTS: Record<Channel, number> = { x: 0, y: 0, rotate: 0, scale: 1, sy: 1, opacity: 1 };
type Opts = Record<string, unknown> & { duration?: number; delay?: number; type?: string };
type Run = { stop: () => void; then: (onfulfilled: () => void) => Promise<unknown> };

/* you lift a folder by its tab, so it tips a hair toward that side */
const leanOf = (f: Folder) => {
  const [tx, tw] = f.tab;
  return ((tx + tw / 2 - (f.x0 + f.x1) / 2) / ((f.x1 - f.x0) / 2)) * 1.3;
};

export default function FileBox({ theme = "light", fill = false, onPull }: FileBoxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const apiRef = useRef<{ settle: () => void } | null>(null);
  const onPullRef = useRef(onPull);
  onPullRef.current = onPull;
  const firstTheme = useRef(true);
  /* gradient and filter ids, unique per instance */
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ref = (name: string) => `url(#${id}-${name})`;

  useEffect(() => {
    const root = rootRef.current;
    const posterEl = posterRef.current;
    const scene = sceneRef.current;
    if (!root || !posterEl || !scene) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const running = new Set<{ stop: () => void }>();

    /* ── build ── */
    const NS = "http://www.w3.org/2000/svg";
    const PAINT = new Set(["fill", "stroke", "fill-opacity", "stroke-opacity"]);
    /* colours are theme tokens, which only resolve in CSS: route paint through style */
    const el = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
      const n = document.createElementNS(NS, tag);
      let style = "";
      for (const k in attrs) {
        const v = String(attrs[k]);
        if (PAINT.has(k) && v.startsWith("var(")) style += `${k}:${v};`;
        else n.setAttribute(k, v);
      }
      if (style) n.setAttribute("style", style);
      parent?.appendChild(n);
      return n as SVGGraphicsElement;
    };

    scene.replaceChildren();
    const base = poly(P(0, 0, 0), P(185, 0, 0), P(185, 1, 0), P(0, 1, 0));
    const shadow = el("g", {}, scene);
    el("path", { d: base, fill: "var(--pfbox-shadow-wide)", "fill-opacity": "var(--pfbox-shadow-wide-o)", stroke: "none", filter: ref("blur-wide"), transform: "translate(22 12)" }, shadow);
    el("path", { d: base, fill: "var(--pfbox-shadow-tight)", "fill-opacity": "var(--pfbox-shadow-tight-o)", stroke: "none", filter: ref("blur-tight"), transform: "translate(4 3)" }, shadow);

    const boxBack = el("g", {}, scene);
    el("path", { d: poly(P(TU, 1 - TD, 0), P(185 - TU, 1 - TD, 0), P(185 - TU, 1 - TD, H), P(TU, 1 - TD, H)), fill: ref("hollow-back") }, boxBack);
    el("path", { d: poly(P(TU, TD, 0), P(TU, 1 - TD, 0), P(TU, 1 - TD, H), P(TU, TD, H)), fill: ref("hollow-side") }, boxBack);
    el("path", { d: poly(P(0, 1, H), P(185, 1, H), P(185, 1 - TD, H), P(TU, 1 - TD, H), P(TU, 0, H), P(0, 0, H)), fill: "var(--pfbox-rim)" }, boxBack);

    const folderLayer = el("g", {}, scene);
    const boxFront = el("g", {}, scene);
    el("path", { d: poly(P(185, 0, 0), P(185, 1, 0), P(185, 1, H), P(185, 0, H)), fill: ref("face-side") }, boxFront);
    el("path", { d: poly(P(0, 0, 0), P(185, 0, 0), P(185, 0, H), P(0, 0, H)), fill: ref("face-front") }, boxFront);
    el("path", { d: poly(P(0, 0, H), P(185, 0, H), P(185, 1, H), P(185 - TU, 1, H), P(185 - TU, TD, H), P(0, TD, H)), fill: "var(--pfbox-rim)" }, boxFront);
    const hole = [P(185, 0.36, H - 22), P(185, 0.64, H - 22)];
    el("path", { d: `M${hole[0][0]} ${hole[0][1]} L${hole[1][0]} ${hole[1][1]}`, stroke: "var(--pfbox-hole)", "stroke-width": 9 }, boxFront);
    const hitLayer = el("g", {}, scene);

    const folders = FOLDERS.map((F, i) => {
      const hv = H - 78 * F.d; // the height at which the folder clears the front rim
      const g = el("g", { "pointer-events": "none" }, folderLayer);
      const local = el("g", { transform: plane(F.d) }, g);
      el("path", { d: backPath(F), fill: `var(--pfbox-${F.c}-b)` }, local);
      el("path", { d: `M${F.x0 + 2} ${-(F.h - FLAP - 2)} H${F.x1 - 2}`, stroke: "var(--pfbox-crease)", "stroke-width": 6 }, local);

      const papers = [0, 1, 2].map((j) => {
        const p = el("g", {}, local);
        const px0 = F.x0 + 7 + j * 4;
        const px1 = F.x1 - 7 - j * 5;
        const top = F.h - 4 - j * 6;
        el("path", { d: roundTop(px0, px1, top, 2), fill: `var(--pfbox-paper-${j + 1})`, "stroke-width": 2.4 }, p);
        for (const [dy, len] of [
          [7, 0.42],
          [12.5, 0.6],
          [18, 0.3],
        ])
          el("path", { d: `M${px0 + 9} ${-(top - dy)} H${px0 + 9 + (px1 - px0 - 18) * len}`, stroke: "var(--pfbox-paper-line)", "stroke-width": 2 }, p);
        return p;
      });

      const front = el("g", {}, local);
      el("path", { d: roundTop(F.x0, F.x1, F.h - FLAP, 6), fill: `var(--pfbox-${F.c}-f)` }, front);
      el("path", { d: `M${F.x0 + 8} ${-(F.h - FLAP - 5)} H${F.x1 - 8}`, stroke: "var(--pfbox-flap-hi)", "stroke-width": 2 }, front);

      /* the rim's shadow is fixed to the box, so a lifted folder slides out of it */
      const occ = el("g", { "pointer-events": "none" }, folderLayer);
      el("rect", { x: 0, y: -(hv + 34), width: 185, height: 34, fill: ref("occ"), stroke: "none", transform: plane(F.d) }, occ);

      /* the hit area: the visible part at rest, extended upward while it is lifted */
      const position = FOLDERS.length - i;
      const hit = el(
        "g",
        { class: "pfbox__hit", tabindex: 0, role: "button", "aria-label": `Pull out the ${F.c} folder, ${ORDINAL[position - 1]} from the front`, transform: plane(F.d) },
        hitLayer,
      );
      el("path", { class: "pfbox__hitBase", d: backPath(F, hv), fill: "#000", "fill-opacity": 0, stroke: "none" }, hit);
      const extend = el("path", { d: backPath(F, hv, LIFT), fill: "#000", "fill-opacity": 0, stroke: "none", "pointer-events": "none" }, hit);

      return { ...F, i, position, g, papers, front, occ, hit, extend };
    });
    type Live = (typeof folders)[number];

    /* ── every transform channel is a Motion value; writes are batched into Motion's render step ── */
    const tf = new WeakMap<Element, Record<Channel, MotionValue<number>>>();
    const init = (node: SVGGraphicsElement, origin = "50% 50%") => {
      const mv = {} as Record<Channel, MotionValue<number>>;
      let queued = false;
      const render = () => {
        queued = false;
        node.style.transform = `translate(${mv.x.get()}px, ${mv.y.get()}px) rotate(${mv.rotate.get()}deg) scale(${mv.scale.get()}, ${mv.scale.get() * mv.sy.get()})`;
        node.style.opacity = String(mv.opacity.get());
      };
      for (const k of Object.keys(DEFAULTS) as Channel[]) {
        mv[k] = motionValue(DEFAULTS[k]);
        mv[k].on("change", () => {
          if (queued) return;
          queued = true;
          frame.render(render);
        });
      }
      tf.set(node, mv);
      node.style.transformBox = "fill-box";
      node.style.transformOrigin = origin;
      render();
      return mv;
    };
    const move = (node: SVGGraphicsElement, props: Partial<Record<Channel, number | (number | null)[]>>, opts: Opts = {}): Run => {
      const mv = tf.get(node) ?? init(node);
      const runs: { stop: () => void; then: (f: () => void, r?: () => void) => unknown }[] = [];
      for (const [k, to] of Object.entries(props) as [Channel, number | (number | null)[]][]) {
        const v = mv[k];
        const kf = (Array.isArray(to) ? to : [to]).map((x) => (x == null ? v.get() : x));
        if (opts.duration === 0) {
          v.jump(kf[kf.length - 1]);
          continue;
        }
        /* a spring takes one target; a multi-step gesture becomes an eased tween */
        const o = kf.length > 2 && opts.type === "spring" ? { duration: 0.6, ease: EASE, delay: opts.delay } : opts;
        const t = o as ValueAnimationTransition<number>;
        const a = kf.length === 1 ? animate(v, kf[0], t) : animate(v, kf, t);
        running.add(a);
        a.then(
          () => running.delete(a),
          () => running.delete(a),
        );
        runs.push(a);
      }
      const done = Promise.all(runs.map((r) => new Promise<void>((res) => r.then(res, res))));
      return { stop: () => runs.forEach((r) => r.stop()), then: (f) => done.then(f) };
    };

    folders.forEach((f) => {
      init(f.g);
      init(f.front, "50% 100%");
      f.papers.forEach((p) => init(p, "50% 100%"));
    });
    init(shadow);
    [boxBack, boxFront].forEach((b) => init(b, "50% 100%"));
    /* the rim's shadows belong to the box: they arrive with it */
    folders.forEach((f) => init(f.occ));

    /* ── intro: the box settles onto the table and the folders are filed in ── */
    let interacted = false;
    let hovered: Live | null = null;
    let run = 0;

    const intro = () => {
      const r = ++run;
      hovered = null;
      if (reduced) {
        root.dataset.ready = "";
        return;
      }
      /* the box fades in as one layer: faded separately, its dark hollow would show through its front */
      [boxBack, boxFront].forEach((b) => move(b, { y: 26, sy: 1 }, { duration: 0 }));
      scene.style.opacity = "0";
      move(shadow, { opacity: 0, scale: 0.92 }, { duration: 0 });
      folders.forEach((f) => move(f.occ, { opacity: 0 }, { duration: 0 }));
      folders.forEach((f) => {
        move(f.g, { y: -120, opacity: 0 }, { duration: 0 });
        move(f.front, { sy: 1 }, { duration: 0 });
        f.papers.forEach((p, j) => move(p, { y: 0, rotate: PAPER_TILT[j] }, { duration: 0 }));
      });
      root.dataset.ready = "";

      running.add(animate(scene, { opacity: [0, 1] }, { duration: 0.45, ease: EASE }));
      [boxBack, boxFront].forEach((b) => move(b, { y: 0 }, { type: "spring", stiffness: 160, damping: 20 }));
      folders.forEach((f) => move(f.occ, { opacity: 1 }, { duration: 0.5, ease: EASE, delay: 0.15 }));
      move(shadow, { opacity: 1, scale: 1 }, { duration: 0.9, ease: EASE, delay: 0.1 });

      /* filed in back to front; the papers follow through as each lands */
      folders.forEach((f, i) => {
        const at = 0.35 + i * 0.085;
        move(f.g, { opacity: 1 }, { duration: 0.22, delay: at });
        move(f.g, { y: 0 }, { type: "spring", stiffness: 240, damping: 19, delay: at });
        f.papers.forEach((p, j) => move(p, { y: [-16, 0] }, { type: "spring", stiffness: 260, damping: 13, delay: at + 0.12 + j * 0.03 }));
      });
      /* the box gives a little as the last folder lands */
      later(() => {
        if (r !== run) return;
        [boxBack, boxFront].forEach((b) => move(b, { sy: [1, 0.985, 1] }, { duration: 0.35, ease: EASE }));
      }, 900);
      /* one gentle "these are interactive" wave, unless someone already found out */
      later(() => {
        if (r !== run || interacted) return;
        folders.forEach((f, i) => move(f.g, { y: [0, -10, 0] }, { duration: 0.6, ease: "easeInOut", delay: i * 0.07 }));
      }, 2400);
    };

    /* ── hover: pulled up by its tab, the flap falls open, the papers lag behind ── */
    const setHover = (target: Live | null) => {
      hovered = target;
      folders.forEach((f) => {
        const on = f === target;
        f.extend.setAttribute("pointer-events", on ? "all" : "none");
        if (on) {
          move(f.g, { y: -LIFT, rotate: leanOf(f) }, reduced ? { duration: 0 } : HOVER.lift);
          move(f.front, { sy: 0.86 }, reduced ? { duration: 0 } : { ...HOVER.flap, delay: 0.07 });
          f.papers.forEach((p, j) =>
            move(p, { y: -(3 + j * 4), rotate: PAPER_TILT[j] + PAPER_FAN[j] * 0.8 }, reduced ? { duration: 0 } : { ...HOVER.paper, delay: 0.1 + j * 0.05 }),
          );
        } else {
          /* the neighbours give way a little — less the further away they are */
          const dist = target ? f.i - target.i : 0;
          const dy = dist === 0 ? 0 : (dist > 0 ? 3.5 : 1.5) / Math.abs(dist);
          const tilt = dist === 0 ? 0 : (-Math.sign(dist) * 0.5) / Math.abs(dist);
          const wasUp = tf.get(f.g)!.y.get() < -LIFT / 2;
          move(f.g, { y: dy, rotate: tilt }, reduced ? { duration: 0 } : wasUp ? HOVER.drop : { ...HOVER.nudge, delay: 0.03 * Math.abs(dist) });
          move(f.front, { sy: 1 }, reduced ? { duration: 0 } : HOVER.flap);
          /* the sheets land after the folder does */
          f.papers.forEach((p, j) =>
            move(p, { y: 0, rotate: PAPER_TILT[j] }, reduced ? { duration: 0 } : { ...HOVER.paper, delay: wasUp ? 0.06 + (2 - j) * 0.04 : 0 }),
          );
        }
      });
    };

    const pull = (f: Live) => {
      interacted = true;
      onPullRef.current?.({ color: f.c, position: f.position });
      if (reduced) return;
      /* a quick tug: up past the hover height, the sheets flick, then it eases back */
      const rest = hovered === f;
      move(f.g, { y: [null, -LIFT - 26, rest ? -LIFT : 0] }, { duration: 0.75, ease: [0.33, 1, 0.68, 1] });
      f.papers.forEach((p, j) =>
        move(p, { y: [null, -(18 + j * 9), rest ? -(3 + j * 4) : 0] }, { duration: 0.85, ease: [0.33, 1, 0.68, 1], delay: 0.05 + j * 0.05 }),
      );
      later(() => [boxBack, boxFront].forEach((b) => move(b, { sy: [1, 0.992, 1] }, { duration: 0.35, ease: EASE })), 420);
    };

    const offs: (() => void)[] = [];
    const on = (target: EventTarget, type: string, fn: (e: Event) => void) => {
      target.addEventListener(type, fn);
      offs.push(() => target.removeEventListener(type, fn));
    };

    folders.forEach((f) => {
      /* a short grace period on leave, so gliding from one folder to the next
         hands over directly instead of dropping everything for a frame */
      let leaveTimer = 0;
      const enter = () => {
        clearTimeout(leaveTimer);
        interacted = true;
        if (hovered !== f) setHover(f);
      };
      const leave = () => {
        clearTimeout(leaveTimer);
        leaveTimer = window.setTimeout(() => hovered === f && setHover(null), 80);
      };
      on(f.hit, "pointerenter", enter);
      on(f.hit, "pointerleave", leave);
      on(f.hit, "focus", enter);
      on(f.hit, "blur", leave);
      on(f.hit, "click", () => pull(f));
      on(f.hit, "keydown", (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === "Enter" || k === " ") {
          e.preventDefault();
          pull(f);
        }
      });
      offs.push(() => clearTimeout(leaveTimer));
    });

    /* ── depth: the scene tilts with the pointer and the shadow answers the light ── */
    const tiltX = motionValue(0);
    const tiltY = motionValue(0);
    const writeTilt = () => (posterEl.style.transform = `rotateY(${tiltY.get()}deg) rotateX(${tiltX.get()}deg)`);
    tiltX.on("change", writeTilt);
    tiltY.on("change", writeTilt);
    if (!reduced) {
      on(root, "pointermove", (e) => {
        const r = root.getBoundingClientRect();
        const px = ((e as PointerEvent).clientX - r.left) / r.width - 0.5;
        const py = ((e as PointerEvent).clientY - r.top) / r.height - 0.5;
        running.add(animate(tiltY, px * 3, SOFT));
        running.add(animate(tiltX, -py * 3, SOFT));
        move(shadow, { x: -px * 10, y: -py * 5 }, SOFT);
      });
      on(root, "pointerleave", () => {
        running.add(animate(tiltY, 0, SOFT));
        running.add(animate(tiltX, 0, SOFT));
        move(shadow, { x: 0, y: 0 }, SOFT);
      });
    }

    /* R replays the intro while the box has focus */
    on(root, "keydown", (e) => {
      const k = e as KeyboardEvent;
      if (k.key.toLowerCase() === "r" && !k.metaKey && !k.ctrlKey && !k.altKey && !k.repeat) intro();
    });

    apiRef.current = {
      /* the box settles under the new light */
      settle: () => !reduced && [boxBack, boxFront].forEach((b) => move(b, { sy: [1, 0.985, 1] }, { duration: 0.45, ease: EASE, delay: 0.15 })),
    };

    intro();

    return () => {
      apiRef.current = null;
      offs.forEach((off) => off());
      timers.forEach((t) => clearTimeout(t));
      running.forEach((a) => a.stop());
      tiltX.destroy();
      tiltY.destroy();
      scene.replaceChildren();
      scene.style.opacity = "";
      delete root.dataset.ready;
    };
  }, [id]);

  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    apiRef.current?.settle();
  }, [theme]);

  return (
    <div ref={rootRef} className="pfbox" data-theme={theme} data-fill={fill || undefined}>
      <div ref={posterRef} className="pfbox__poster">
        <svg
          viewBox="0 0 736 736"
          className="pfbox__art"
          strokeWidth="3.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          role="group"
          aria-label="A cardboard file box holding five colourful folders. Hover or focus a folder to lift it out; click or press Enter to tug it."
        >
          <defs>
            <linearGradient id={`${id}-occ`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" style={{ stopColor: "var(--pfbox-occ)", stopOpacity: "var(--pfbox-occ-o)" }} />
              <stop offset="1" style={{ stopColor: "var(--pfbox-occ)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id={`${id}-hollow-back`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--pfbox-hollow-1)" }} />
              <stop offset="1" style={{ stopColor: "var(--pfbox-hollow-2)" }} />
            </linearGradient>
            <linearGradient id={`${id}-hollow-side`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: "var(--pfbox-hollow-side-1)" }} />
              <stop offset="1" style={{ stopColor: "var(--pfbox-hollow-side-2)" }} />
            </linearGradient>
            <linearGradient id={`${id}-face-front`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--pfbox-face-front-1)" }} />
              <stop offset="1" style={{ stopColor: "var(--pfbox-face-front-2)" }} />
            </linearGradient>
            <linearGradient id={`${id}-face-side`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--pfbox-face-side-1)" }} />
              <stop offset="1" style={{ stopColor: "var(--pfbox-face-side-2)" }} />
            </linearGradient>
            <filter id={`${id}-blur-wide`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id={`${id}-blur-tight`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          <g ref={sceneRef} />
        </svg>
      </div>

      <svg className="pfbox__grain" aria-hidden="true">
        <filter id={`${id}-noise`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.6 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}-noise)`} />
      </svg>
    </div>
  );
}
