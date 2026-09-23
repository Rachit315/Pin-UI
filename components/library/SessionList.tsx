"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, hover, press, useAnimationFrame, useReducedMotion } from "motion/react";
import "./session-list.css";

/* ------------------------------------------------------------------ props -- */

export type SessionBlock = { label: string; seconds: number };

export type SessionListProps = {
  /** Corner radius of the card, 0–40px. */
  corner?: number;
  /**
   * How many blocks of the plan are listed. Strings are accepted too, so the
   * documented `rows="4"` form works as well as `rows={4}`.
   */
  rows?: 2 | 3 | 4 | "2" | "3" | "4";
  /** The session itself. Each block is as wide on the track as it is long. */
  plan?: SessionBlock[];
  /** Show the fast-forward buttons under the card. */
  speedControl?: boolean;
  /** Fired when a block hands over to the next one. */
  onBlockChange?: (index: number, block: SessionBlock) => void;
};

const DEFAULT_PLAN: SessionBlock[] = [
  { label: "Preparation", seconds: 25 * 60 + 4 },
  { label: "Warm up", seconds: 12 * 60 + 30 },
  { label: "Main set", seconds: 18 * 60 },
  { label: "Cool down", seconds: 6 * 60 + 45 },
];

/** 1 = real time: one second on screen is one second of the session. */
const SPEEDS = [1, 10, 60];
/** How often the model is advanced, whether or not frames are running. */
const TICK_MS = 100;
/** How long 00:00 is held before the next block opens. */
const HANDOVER_MS = 380;
/** How long the finished card rests before it replays. */
const REST_MS = 2600;
/** One period of the diagonal hatch, in px. */
const HATCH = 9.9;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s - 1e-6));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** The session total runs past an hour, so it gets an hour field. */
const hms = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const head = h
    ? `${h}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}`
    : String(Math.floor(t / 60)).padStart(2, "0");
  return `${head}:${String(t % 60).padStart(2, "0")}`;
};

const spoken = (s: number) => {
  const t = Math.max(0, Math.ceil(s - 1e-6));
  const m = Math.floor(t / 60);
  return `${m ? `${m} min ` : ""}${t % 60} sec`;
};

type Slot = { roll: HTMLSpanElement; front: HTMLSpanElement; back: HTMLSpanElement; value: string };

/* -------------------------------------------------------------- component -- */

/**
 * A session broken into blocks, counting down.
 *
 * One number drives the whole card: `elapsed`, the seconds spent in the session
 * so far. The live block, the time left on it, the playhead's position and
 * every block's state are all read back out of that number, so they cannot
 * disagree — the clock lands on 00:00 on the same tick the playhead reaches
 * the end of its block, and that is what hands over to the next one.
 *
 * The model is held in refs rather than React state on purpose. It advances ten
 * times a second, and a re-render per tick would both waste the work and fight
 * the animations for control of the same properties. React owns the shape of
 * the card; the clock owns what is written into it.
 */
export default function SessionList({
  corner = 40,
  rows = 4,
  plan: rawPlan = DEFAULT_PLAN,
  speedControl = true,
  onBlockChange,
}: SessionListProps) {
  const reduced = useReducedMotion();

  const radius = clamp(corner, 0, 40);
  const cellCorner = Math.max(5, Math.round(radius * 0.3));

  /* the plan, with each block's place on the timeline worked out once */
  const rowCount = clamp(Number(rows) || 4, 2, 4);
  const plan = useRef<(SessionBlock & { start: number; end: number })[]>([]);
  const total = useRef(0);
  if (plan.current.length !== rowCount || plan.current[0]?.label !== rawPlan[0]?.label) {
    let cursor = 0;
    plan.current = rawPlan.slice(0, rowCount).map((block) => {
      const start = cursor;
      cursor += block.seconds;
      return { ...block, start, end: cursor };
    });
    total.current = cursor;
  }
  const blocks = plan.current;

  const [speed, setSpeed] = useState(SPEEDS[0]);

  /* --- the model, none of it in React state ------------------------------ */

  const elapsed = useRef(0);
  const playing = useRef(true);
  const finished = useRef(false);
  const liveIndex = useRef(0);
  const shownIndex = useRef(-1);
  const hoverIndex = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const holdClock = useRef(false);
  const speedRef = useRef(SPEEDS[0]);
  /* the pill's own position, chasing the playhead on a spring integrated here */
  const tipX = useRef<number | null>(null);
  const tipV = useRef(0);

  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hatchLoop = useRef<ReturnType<typeof animate> | null>(null);

  /* --- DOM ---------------------------------------------------------------- */

  const cardRef = useRef<HTMLElement>(null);
  const headBlockRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const tickPathRef = useRef<SVGPathElement>(null);
  const iconTickRef = useRef<SVGSVGElement>(null);
  const iconReplayRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tipLayerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipIndexRef = useRef<HTMLSpanElement>(null);
  const tipLabelRef = useRef<HTMLSpanElement>(null);
  const tipTimeRef = useRef<HTMLSpanElement>(null);
  const tipArrowRef = useRef<HTMLSpanElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<(Slot | null)[]>([]);

  const spring = useCallback(
    (stiffness: number, damping: number, mass = 1) =>
      reduced ? ({ duration: 0 } as const) : ({ type: "spring", stiffness, damping, mass } as const),
    [reduced],
  );

  /* everything below is derived — never stored twice */
  const blockAt = useCallback(
    (t: number) => {
      for (let i = blocks.length - 1; i >= 0; i -= 1) if (t >= blocks[i].start) return i;
      return 0;
    },
    [blocks],
  );
  const leftOn = useCallback(
    (i: number) => blocks[i].end - clamp(elapsed.current, blocks[i].start, blocks[i].end),
    [blocks],
  );
  const progressIn = useCallback(
    (i: number) => clamp((elapsed.current - blocks[i].start) / blocks[i].seconds, 0, 1),
    [blocks],
  );

  /* --- the clock ---------------------------------------------------------- */

  const setClock = useCallback((text: string) => {
    [...text].forEach((ch, i) => {
      const slot = slots.current[i];
      if (!slot || slot.value === ch) return;
      const previous = slot.value;
      slot.value = ch;
      /* the value is written first and the roller's resting position shows it,
         so the clock is correct even if the slide never runs */
      slot.front.textContent = ch;
      slot.back.textContent = previous;
      animate(
        slot.roll,
        { transform: ["translateY(-1em)", "translateY(0em)"] },
        { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
      );
    });
  }, []);

  const drawClock = useCallback(() => {
    if (holdClock.current) return;
    setClock(finished.current ? "00:00" : mmss(leftOn(liveIndex.current)));
  }, [leftOn, setClock]);

  const drawHead = useCallback(() => {
    const cell = cellRefs.current[liveIndex.current];
    const head = playheadRef.current;
    if (!cell || !head) return;
    head.style.transform = `translateX(${cell.offsetLeft + 4 + progressIn(liveIndex.current) * (cell.offsetWidth - 2)}px)`;
    head.style.opacity = finished.current ? "0" : playing.current ? "1" : "0.35";
  }, [progressIn]);

  /* --- painting ----------------------------------------------------------- */

  /* Motion draws the movement while the resting style is written at the same
     time, so a card in a tab that stopped rendering still reads correctly. */
  const paintCells = useCallback(
    (animated = true) => {
      const spec = animated && !reduced ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 };
      cellRefs.current.forEach((cell, i) => {
        if (!cell) return;
        const done = finished.current || i < liveIndex.current;
        const live = !finished.current && i === liveIndex.current;
        const fill = cell.querySelector<HTMLElement>("[data-fill]");
        const hatch = cell.querySelector<HTMLElement>("[data-hatch]");
        const ring = cell.querySelector<HTMLElement>("[data-ring]");
        const mark = cell.querySelector<HTMLElement>("[data-done]");
        if (!fill || !hatch || !ring || !mark) return;

        const fillTo = done ? 1 : live ? 0.6 : 0;
        animate(fill, { opacity: fillTo }, spec);
        animate(hatch, { opacity: live ? 1 : 0 }, spec);
        animate(ring, { opacity: live ? 1 : 0 }, spec);
        animate(mark, { opacity: done ? 1 : 0 }, spec);
        if (mark.firstElementChild) {
          animate(mark.firstElementChild, { scale: done ? 1 : 0.6 }, animated ? spring(520, 24) : { duration: 0 });
        }
        fill.style.opacity = String(fillTo);
        hatch.style.opacity = live ? "1" : "0";
        ring.style.opacity = live ? "1" : "0";
        mark.style.opacity = done ? "1" : "0";
        cell.setAttribute("aria-current", live ? "step" : "false");
      });
    },
    [reduced, spring],
  );

  /* where the pill wants to point: the playhead while the session runs, or the
     middle of whichever block the cursor is previewing */
  const tipTargetX = useCallback(() => {
    const i = hoverIndex.current ?? liveIndex.current;
    const cell = cellRefs.current[i];
    const track = trackRef.current;
    if (!cell || !track) return 0;
    const inside =
      hoverIndex.current !== null || finished.current
        ? cell.offsetLeft + cell.offsetWidth / 2
        : cell.offsetLeft + 5 + progressIn(i) * (cell.offsetWidth - 2);
    return track.offsetLeft + inside;
  }, [progressIn]);

  const placeTip = useCallback(
    (seconds = 0, snap = false) => {
      const tip = tipRef.current;
      const card = cardRef.current;
      const arrow = tipArrowRef.current;
      if (!tip || !card || !arrow) return;

      const centre = tipTargetX();
      const width = tip.offsetWidth;
      const style = getComputedStyle(card);
      const bounds = card.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const target = clamp(centre - width / 2, 0, Math.max(0, bounds - width));

      if (snap || tipX.current === null || reduced) {
        tipX.current = target;
        tipV.current = 0;
      } else {
        /* fixed sub-steps, so the spring is stable whatever the tick rate is */
        let left = Math.min(0.25, seconds);
        while (left > 0) {
          const h = Math.min(1 / 120, left);
          left -= h;
          tipV.current += ((target - tipX.current) * 260 - tipV.current * 30) * h;
          tipX.current += tipV.current * h;
        }
      }

      tip.style.transform = `translateX(${tipX.current}px)`;
      arrow.style.left = `${clamp(centre - tipX.current - 5, 10, Math.max(10, width - 20))}px`;
    },
    [reduced, tipTargetX],
  );

  /* the pill always describes one block: the live one, or the hovered one */
  const showTip = useCallback(
    (i: number, { preview = false, animated = true }: { preview?: boolean; animated?: boolean } = {}) => {
      const tip = tipRef.current;
      if (!tip) return;
      const from = tip.offsetWidth;
      if (tipIndexRef.current) tipIndexRef.current.textContent = String(i + 1);
      if (tipLabelRef.current) tipLabelRef.current.textContent = blocks[i].label;
      if (tipTimeRef.current) {
        tipTimeRef.current.textContent = mmss(blocks[i].seconds);
        tipTimeRef.current.hidden = !preview;
      }

      tip.style.width = "auto";
      const to = tip.offsetWidth;
      if (animated && !reduced && to !== from) {
        animate(tip, { width: [`${from}px`, `${to}px`] }, spring(400, 36));
      }
      if (animated && !reduced && i !== shownIndex.current) {
        if (tipLabelRef.current) animate(tipLabelRef.current, { opacity: [0, 1], y: [7, 0] }, { duration: 0.24, ease: "easeOut" });
        if (tipIndexRef.current) animate(tipIndexRef.current, { scale: [0.4, 1], opacity: [0, 1] }, spring(600, 22));
      }
      shownIndex.current = i;
      if (!animated) placeTip(0, true);
    },
    [blocks, placeTip, reduced, spring],
  );

  const setCaption = useCallback(
    (text: string) => {
      const el = captionRef.current;
      if (!el || el.textContent?.trim() === text) return;
      /* the words change first; the fade is dressing */
      el.textContent = text;
      if (!reduced) animate(el, { opacity: [0, 1], y: [7, 0] }, { duration: 0.24, ease: "easeOut" });
    },
    [reduced],
  );

  /* --- transitions --------------------------------------------------------- */

  const celebrate = useCallback(() => {
    /* a spring takes two keyframes, not three: the pop is the overshoot on the
       way back from the peak, not a middle frame */
    if (checkRef.current) animate(checkRef.current, { scale: [1.22, 1] }, spring(500, 15));
    if (tickPathRef.current) {
      animate(
        tickPathRef.current,
        { pathLength: [0, 1], opacity: [0.35, 1] },
        reduced ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      );
    }
  }, [reduced, spring]);

  const swapBadge = useCallback(
    (mode: "tick" | "replay") => {
      const toReplay = mode === "replay";
      if (checkRef.current) {
        const title = toReplay ? "Replay the session" : "Finish this block now";
        checkRef.current.title = title;
        checkRef.current.setAttribute("aria-label", title);
      }
      const tick = iconTickRef.current;
      const replay = iconReplayRef.current;
      if (!tick || !replay) return;
      animate(tick, { opacity: toReplay ? 0 : 1, scale: toReplay ? 0.6 : 1 }, spring(480, 26));
      animate(replay, { opacity: toReplay ? 1 : 0, scale: toReplay ? 1 : 0.6 }, spring(480, 26));
      tick.style.opacity = toReplay ? "0" : "1";
      replay.style.opacity = toReplay ? "1" : "0";
    },
    [spring],
  );

  const enterBlock = useCallback(
    (i: number, celebrated = false) => {
      liveIndex.current = i;
      paintCells();
      setCaption(`Left for ${blocks[i].label.toLowerCase()}`);
      if (hoverIndex.current === null) {
        showTip(i);
        if (tipRef.current && !reduced) animate(tipRef.current, { scale: [0.92, 1] }, spring(520, 20));
      }
      if (celebrated) celebrate();
      drawClock();
      drawHead();
      onBlockChange?.(i, blocks[i]);
    },
    [blocks, celebrate, drawClock, drawHead, onBlockChange, paintCells, reduced, setCaption, showTip, spring],
  );

  const restart = useCallback(() => {
    clearTimeout(restTimer.current);
    clearTimeout(handoverTimer.current);
    holdClock.current = false;
    finished.current = false;
    playing.current = true;
    elapsed.current = 0;
    swapBadge("tick");
    if (tipRef.current) {
      animate(tipRef.current, { opacity: 1 }, { duration: reduced ? 0 : 0.2 });
      tipRef.current.style.opacity = "1";
    }
    enterBlock(0);
    if (reduced) return;
    cellRefs.current.forEach((cell, i) => {
      if (cell) animate(cell, { scaleY: [0.82, 1] }, { ...spring(500, 26), delay: i * 0.05 });
    });
  }, [enterBlock, reduced, spring, swapBadge]);

  const setFinished = useCallback(() => {
    clearTimeout(handoverTimer.current);
    holdClock.current = false;
    finished.current = true;
    playing.current = false;
    elapsed.current = total.current;
    liveIndex.current = blocks.length - 1;
    paintCells();
    drawClock();
    drawHead();
    setCaption(`Session complete · ${hms(total.current)} total`);
    celebrate();
    swapBadge("replay");
    if (hoverIndex.current === null) {
      showTip(blocks.length - 1);
      if (tipRef.current) {
        animate(tipRef.current, { opacity: [1, 0.35] }, { duration: reduced ? 0 : 0.3 });
        tipRef.current.style.opacity = "0.35";
      }
    }
    if (!reduced) {
      cellRefs.current.forEach((cell, i) => {
        if (cell) animate(cell, { scale: [1.04, 1] }, { ...spring(520, 22), delay: i * 0.05 });
      });
    }
    clearTimeout(restTimer.current);
    restTimer.current = setTimeout(restart, REST_MS);
  }, [blocks.length, celebrate, drawClock, drawHead, paintCells, reduced, restart, setCaption, showTip, spring, swapBadge]);

  /* a block runs out: the clock lands on 00:00 and rests there for a beat,
     then the next block's full length rolls in */
  const handOver = useCallback(
    (next: number) => {
      clearTimeout(handoverTimer.current);
      holdClock.current = true;
      setClock("00:00");
      handoverTimer.current = setTimeout(
        () => {
          holdClock.current = false;
          drawClock();
        },
        reduced ? 0 : HANDOVER_MS,
      );
      enterBlock(next, true);
    },
    [drawClock, enterBlock, reduced, setClock],
  );

  /* jump to the start of a block — the clock, the playhead and every block
     state follow from the new `elapsed`, so nothing can drift out of step */
  const goTo = useCallback(
    (i: number) => {
      clearTimeout(restTimer.current);
      clearTimeout(handoverTimer.current);
      holdClock.current = false;
      const next = clamp(i, 0, blocks.length);
      if (next >= blocks.length) {
        setFinished();
        return;
      }
      finished.current = false;
      playing.current = true;
      elapsed.current = blocks[next].start;
      swapBadge("tick");
      if (tipRef.current) {
        animate(tipRef.current, { opacity: 1 }, { duration: reduced ? 0 : 0.2 });
        tipRef.current.style.opacity = "1";
      }
      enterBlock(next);
    },
    [blocks, enterBlock, reduced, setFinished, swapBadge],
  );

  const setPlaying = useCallback(
    (next: boolean) => {
      if (finished.current) {
        restart();
        return;
      }
      playing.current = next;
      if (hatchLoop.current) {
        if (next) hatchLoop.current.play();
        else hatchLoop.current.pause();
      }
      setCaption(
        next
          ? `Left for ${blocks[liveIndex.current].label.toLowerCase()}`
          : `Paused · ${mmss(leftOn(liveIndex.current))} left on ${blocks[liveIndex.current].label.toLowerCase()}`,
      );
      drawHead();
    },
    [blocks, drawHead, leftOn, restart, setCaption],
  );

  /* --- the loop ------------------------------------------------------------
     `step` is idempotent: it consumes whatever real time has passed since it
     last ran, so it can be driven by anything. A timer drives it, because a
     countdown has to keep counting where animation frames are throttled;
     the frame loop rides along for a smooth playhead when it is running. */

  const step = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(1000, Math.max(0, now - lastFrame.current));
    lastFrame.current = now;

    if (playing.current && !finished.current && dt > 0) {
      elapsed.current = Math.min(total.current, elapsed.current + (dt / 1000) * speedRef.current);
      const i = blockAt(elapsed.current);
      if (elapsed.current >= total.current) setFinished();
      else if (i !== liveIndex.current) handOver(i);
      else {
        drawHead();
        drawClock();
      }
    }

    placeTip(dt / 1000);
  }, [blockAt, drawClock, drawHead, handOver, placeTip, setFinished]);

  const stepRef = useRef(step);
  stepRef.current = step;

  useAnimationFrame(() => stepRef.current());

  useEffect(() => {
    lastFrame.current = performance.now();
    const ticker = setInterval(() => stepRef.current(), TICK_MS);
    return () => clearInterval(ticker);
  }, []);

  /* --- entrance ------------------------------------------------------------ */

  useEffect(() => {
    paintCells(false);
    showTip(0, { animated: false });
    drawClock();
    drawHead();
    swapBadge("tick");

    if (!reduced) {
      hatchLoop.current = animate(
        Array.from(cardRef.current?.querySelectorAll<HTMLElement>("[data-hatch]") ?? []),
        { backgroundPositionX: ["0px", `${HATCH}px`] },
        { duration: 1.1, ease: "linear", repeat: Number.POSITIVE_INFINITY },
      );
    }

    const onResize = () => {
      drawHead();
      placeTip(0, true);
    };
    /* a hidden tab must not fast-forward the session when it comes back */
    const onVisible = () => {
      lastFrame.current = performance.now();
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      hatchLoop.current?.stop();
      clearTimeout(restTimer.current);
      clearTimeout(handoverTimer.current);
      clearTimeout(entranceTimer.current);
    };
    // the card is set up once, when it mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) return;
    const card = cardRef.current;
    if (!card) return;

    const endEntrance = () => {
      clearTimeout(entranceTimer.current);
      const touched = [
        card,
        checkRef.current,
        tipLayerRef.current,
        ...cellRefs.current,
        ...Array.from(headBlockRef.current?.children ?? []),
      ].filter(Boolean) as HTMLElement[];
      touched.forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel());
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      paintCells(false);
      showTip(shownIndex.current < 0 ? liveIndex.current : shownIndex.current, { animated: false });
      drawHead();
    };

    const play = () => {
      /* whatever the entrance is doing, 1.6s later the card is simply in its
         finished state — an animation frozen by a page that stopped rendering
         can never leave it half drawn */
      clearTimeout(entranceTimer.current);
      entranceTimer.current = setTimeout(endEntrance, 1600);

      animate(card, { opacity: [0, 1], scale: [0.9, 1], y: [22, 0] }, spring(260, 24));
      const head = Array.from(headBlockRef.current?.children ?? []) as HTMLElement[];
      if (head.length) {
        animate(head, { opacity: [0, 1], y: [14, 0] }, { ...spring(340, 28), delay: (i: number) => 0.12 + i * 0.07 });
      }
      if (checkRef.current) {
        animate(checkRef.current, { opacity: [0, 1], scale: [0.5, 1], rotate: [-25, 0] }, { ...spring(420, 18), delay: 0.24 });
      }
      if (tickPathRef.current) {
        animate(tickPathRef.current, { pathLength: [0, 1] }, { duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] });
      }
      const cells = cellRefs.current.filter(Boolean) as HTMLElement[];
      if (cells.length) {
        animate(
          cells,
          { opacity: [0, 1], scaleY: [0.55, 1], y: [10, 0] },
          { ...spring(380, 26), delay: (i: number) => 0.2 + i * 0.06 },
        );
      }
      if (tipLayerRef.current) {
        animate(tipLayerRef.current, { opacity: [0, 1], scale: [0.7, 1], y: [10, 0] }, { ...spring(460, 20), delay: 0.52 });
      }
      if (playheadRef.current) animate(playheadRef.current, { opacity: [0, 1] }, { duration: 0.4, delay: 0.64 });
    };

    /* an entrance played into a page nobody is looking at would only freeze
       half-way, so it waits for the page to be on screen */
    if (document.visibilityState === "hidden") {
      const once = () => {
        if (document.visibilityState === "hidden") return;
        document.removeEventListener("visibilitychange", once);
        play();
      };
      document.addEventListener("visibilitychange", once);
      return () => document.removeEventListener("visibilitychange", once);
    }
    play();
    // the entrance plays once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- the blocks ---------------------------------------------------------- */

  /*
   * Hover and press go through Motion rather than React's pointer events.
   * `onPointerUp` never fires on an element the pointer has already left, so a
   * press that turns into a drag off the block would leave it shrunk; `press`
   * ends on pointer-up anywhere, and on cancel.
   */
  useEffect(() => {
    if (reduced) return;
    const stops = cellRefs.current.flatMap((cell, i) => {
      if (!cell) return [];
      return [
        hover(cell, () => {
          hoverIndex.current = i;
          animate(cell, { y: -2 }, spring(420, 28));
          /* peek at that block without touching the session */
          showTip(i, { preview: true });
          return () => {
            animate(cell, { y: 0 }, spring(420, 28));
            if (hoverIndex.current === i) {
              hoverIndex.current = null;
              showTip(liveIndex.current);
            }
          };
        }),
        press(cell, () => {
          animate(cell, { scale: 0.955 }, spring(600, 30));
          return () => animate(cell, { scale: 1 }, spring(500, 20));
        }),
      ];
    });
    return () => stops.forEach((stop) => stop());
  }, [blocks.length, reduced, showTip, spring]);

  /* --- keyboard ------------------------------------------------------------ */

  function onKey(e: React.KeyboardEvent) {
    if (e.code === "Space") {
      e.preventDefault();
      setPlaying(!playing.current);
    } else if (e.key === "ArrowRight") {
      goTo(liveIndex.current + 1);
    } else if (e.key === "ArrowLeft") {
      goTo(finished.current ? blocks.length - 1 : liveIndex.current - 1);
    }
  }

  /* --- render -------------------------------------------------------------- */

  const clockText = mmss(blocks[0].seconds);

  return (
    <div className="psess">
      <section
        className="psess__card"
        ref={cardRef}
        tabIndex={0}
        role="group"
        aria-label={`Session, ${blocks.length} blocks`}
        style={{ borderRadius: radius }}
        onKeyDown={onKey}
      >
        <header className="psess__head">
          <div ref={headBlockRef}>
            <div className="psess__clock" ref={clockRef}>
              {[...clockText].map((ch, i) =>
                ch === ":" ? (
                  <span className="psess__colon" key={i}>
                    :
                  </span>
                ) : (
                  <span
                    className="psess__digit"
                    key={i}
                    ref={(el) => {
                      if (!el) {
                        slots.current[i] = null;
                        return;
                      }
                      const roll = el.firstElementChild as HTMLSpanElement;
                      slots.current[i] = {
                        roll,
                        front: roll.children[0] as HTMLSpanElement,
                        back: roll.children[1] as HTMLSpanElement,
                        value: ch,
                      };
                    }}
                  >
                    <span className="psess__roll">
                      <span className="psess__face">{ch}</span>
                      <span className="psess__face">{ch}</span>
                    </span>
                  </span>
                ),
              )}
            </div>
            <p className="psess__caption" ref={captionRef} aria-live="polite">
              Left for {blocks[0].label.toLowerCase()}
            </p>
          </div>

          <button
            type="button"
            className="psess__check"
            ref={checkRef}
            onClick={() => {
              if (finished.current) {
                restart();
                return;
              }
              celebrate();
              goTo(liveIndex.current + 1);
            }}
          >
            {/* lucide: check */}
            <svg
              ref={iconTickRef}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path ref={tickPathRef} d="M20 6 9 17l-5-5" pathLength={1} />
            </svg>
            {/* lucide: rotate-ccw */}
            <svg
              className="psess__replay"
              ref={iconReplayRef}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </header>

        <div className="psess__lower">
          <div className="psess__tipLayer" ref={tipLayerRef}>
            <div className="psess__tip" ref={tipRef}>
              <span className="psess__tipIndex" ref={tipIndexRef}>
                1
              </span>
              <span className="psess__tipLabel" ref={tipLabelRef}>
                {blocks[0].label}
              </span>
              <span className="psess__tipTime" ref={tipTimeRef} hidden />
              <span className="psess__tipArrow" ref={tipArrowRef} />
            </div>
          </div>

          <div className="psess__track" ref={trackRef} role="list" aria-label="Session blocks">
            {blocks.map((block, i) => (
              <button
                key={block.label}
                type="button"
                className="psess__cell"
                ref={(el) => {
                  cellRefs.current[i] = el;
                }}
                /* a block is as wide as it is long — the track reads as a timeline */
                style={{ flex: `${block.seconds} 1 0px`, borderRadius: cellCorner }}
                title={`${block.label} · ${mmss(block.seconds)}`}
                aria-label={`Block ${i + 1}, ${block.label}, ${spoken(block.seconds)}. Replay from here`}
                onClick={() => {
                  hoverIndex.current = null;
                  goTo(i);
                }}
              >
                <span className="psess__fill" data-fill />
                <span className="psess__hatch" data-hatch />
                <span className="psess__ring" data-ring style={{ borderRadius: cellCorner }} />
                <span className="psess__done" data-done>
                  {/* lucide: check */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              </button>
            ))}
            <span className="psess__head-line" ref={playheadRef} />
          </div>
        </div>
      </section>

      {speedControl && (
        <div className="psess__speeds" role="group" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              className={`psess__speed${speed === value ? " psess__speed--on" : ""}`}
              aria-pressed={speed === value}
              onClick={() => {
                speedRef.current = value;
                setSpeed(value);
                if (finished.current) restart();
              }}
            >
              {value === 1 ? "Real time" : `${value}×`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
