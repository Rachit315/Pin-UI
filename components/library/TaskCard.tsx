"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { animate, AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import "./task-card.css";

/**
 * Task Card — a task with its subtasks, progress, priority, status and people.
 *
 * The subtasks hang off one connector tree: a trunk that curves into the last
 * row and a branch to every checkbox, drawn as a single SVG whose strokes are
 * snapped to whole device pixels, so at 125% or 150% display scaling no
 * segment paints heavier than another. Ticking a subtask fills its ring on a
 * spring and draws the tick; the progress pill counts up, its bar fills, and
 * its icon turns green when everything is done. Status follows along — all
 * done sets Done, reopening one puts it back In Progress.
 *
 * Priority and Status are coloured pills that open a small menu; picking an
 * option slides the label out and the next one in while the pill's width
 * follows. The ⋯ menu marks everything complete or resets the subtasks. Menus
 * take the arrow keys and Escape, and close on a press outside.
 */

type Tone = "red" | "orange" | "blue" | "gray" | "amber" | "violet" | "green";
type Option = { name: string; tone: Tone };

export type TaskCardSubtask = { label: string; done: boolean };
export type TaskCardPerson = { name: string; avatar?: string; color?: string };

export type TaskCardProps = {
  theme?: "light" | "dark";
  title?: string;
  subtasks?: TaskCardSubtask[];
  priority?: string;
  status?: string;
  people?: TaskCardPerson[];
  /** Fired whenever anything on the card changes. */
  onChange?: (state: { subtasks: TaskCardSubtask[]; priority: string; status: string }) => void;
};

const PRIORITY: Option[] = [
  { name: "Urgent", tone: "red" },
  { name: "High", tone: "orange" },
  { name: "Medium", tone: "blue" },
  { name: "Low", tone: "gray" },
];
const STATUS: Option[] = [
  { name: "To Do", tone: "gray" },
  { name: "In Progress", tone: "amber" },
  { name: "In Review", tone: "violet" },
  { name: "Done", tone: "green" },
];

const DEFAULT_SUBTASKS: TaskCardSubtask[] = [
  { label: "Design Tokens", done: true },
  { label: "Color System", done: true },
  { label: "Type System", done: true },
  { label: "Documentation", done: false },
];

const avatar = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
const DEFAULT_PEOPLE: TaskCardPerson[] = [
  { name: "Chloe", color: "#b6e3f4", avatar: avatar("Chloe-Felix", "b6e3f4") },
  { name: "Anna", color: "#d1d4f9", avatar: avatar("Anna-Luna", "d1d4f9") },
  { name: "Ramesh", color: "#ffd5dc", avatar: avatar("Ramesh-Leo", "ffd5dc") },
];

const SPRING: Transition = { type: "spring", stiffness: 500, damping: 36 };
const SOFT: Transition = { type: "spring", stiffness: 260, damping: 30 };
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* checkbox and row geometry, shared with the tree so each branch lands exactly on its ring */
const CHECK = { size: 18, view: 20, r: 8.9, stroke: 1.4 };
const ROW = { x: 22, pad: 2, h: 36 };
const FILL_R = 9.6;
const RING_EDGE = ROW.x + ROW.pad + CHECK.size / 2 - (CHECK.r + CHECK.stroke / 2) * (CHECK.size / CHECK.view);
/* branches end half a pixel under the ring's stroke: the ring paints on top, so the join is seamless */
const TREE = { top: 10, radius: 8, reach: RING_EDGE + 0.5 };

/* ------------------------------------------------------------------ */

function Check({ done, delay, reduced }: { done: boolean; delay: number; reduced: boolean | null }) {
  return (
    <svg viewBox={`0 0 ${CHECK.view} ${CHECK.view}`} width={CHECK.size} height={CHECK.size} className="ptask__check" aria-hidden>
      <circle className="ptask__ring" cx="10" cy="10" r={CHECK.r} fill="none" strokeWidth={CHECK.stroke} />
      <motion.circle
        className="ptask__fill"
        cx="10"
        cy="10"
        initial={{ r: 0 }}
        animate={{ r: done ? FILL_R : 0 }}
        transition={reduced ? { duration: 0 } : done ? { ...SPRING, delay } : { duration: 0.18, ease: "easeIn", delay: 0.05 }}
      />
      <motion.path
        className="ptask__tick"
        d="M6.3 10.2l2.45 2.45 5-5.1"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: done ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : done ? { duration: 0.26, ease: "easeOut", delay: delay + 0.08 } : { duration: 0.12, ease: "easeIn" }}
      />
    </svg>
  );
}

/** A pill that opens a menu of options; its label slides over and its width follows. */
function PillSelect({
  label,
  value,
  options,
  open,
  onOpen,
  onClose,
  onPick,
  reduced,
}: {
  label: string;
  value: string;
  options: Option[];
  open: boolean;
  onOpen: () => void;
  onClose: (restore?: boolean) => void;
  onPick: (name: string) => void;
  reduced: boolean | null;
}) {
  const tone = options.find((o) => o.name === value)?.tone ?? "gray";
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") ?? []);
    (items.find((i) => i.getAttribute("aria-checked") === "true") ?? items[0])?.focus({ preventScroll: true });
  }, [open]);

  const onMenuKey = (e: ReactKeyboardEvent) => {
    const step = ({ ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + step + items.length) % items.length]?.focus();
  };

  return (
    <div className="ptask__dd" data-dd>
      <motion.button
        ref={triggerRef}
        type="button"
        className="ptask__pill"
        data-tone={tone}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => (open ? onClose() : onOpen())}
        layout={!reduced}
        transition={SPRING}
      >
        <span className="ptask__pillLabel">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={reduced ? false : { y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -6, opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
              transition={SPRING}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.svg
          viewBox="0 0 24 24"
          className="ptask__chev"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          layout={!reduced ? "position" : false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING}
        >
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            className="ptask__menu"
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING, opacity: { duration: 0.14, ease: "easeOut" } } }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.1, ease: "easeIn" } }}
          >
            {options.map((o) => (
              <button
                key={o.name}
                type="button"
                role="menuitemradio"
                aria-checked={o.name === value}
                className="ptask__item"
                data-tone={o.tone}
                onClick={() => {
                  onPick(o.name);
                  onClose(true);
                  triggerRef.current?.focus({ preventScroll: true });
                }}
              >
                <span className="ptask__dot" />
                <span className="ptask__itemName">{o.name}</span>
                <svg viewBox="0 0 24 24" className="ptask__tickmark" data-on={o.name === value || undefined} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function TaskCard({
  theme = "light",
  title = "Design System",
  subtasks = DEFAULT_SUBTASKS,
  priority: initialPriority = "Urgent",
  status: initialStatus = "In Progress",
  people = DEFAULT_PEOPLE,
  onChange,
}: TaskCardProps) {
  const reduced = useReducedMotion();
  const uid = useId();
  const [tasks, setTasks] = useState(() => subtasks.map((t) => ({ ...t })));
  const [priority, setPriority] = useState(initialPriority);
  const [status, setStatus] = useState(initialStatus);
  const [openKey, setOpenKey] = useState<"more" | "priority" | "status" | null>(null);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  /* the counters write their digits straight to the DOM: a count-up never re-renders the card */
  const shownRef = useRef({ done: 0, pct: 0 });
  const doneRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<SVGSVGElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [tree, setTree] = useState<{ trunk: string; branches: string[]; w: number } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  /* the counters roll to their new values */
  useEffect(() => {
    const delay = first.current ? 0.25 : 0;
    first.current = false;
    const opts = { duration: reduced ? 0 : 0.45, delay: reduced ? 0 : delay, ease: EASE_OUT };
    const write = (el: HTMLSpanElement | null, v: number) => {
      const t = String(Math.round(v));
      if (el && el.textContent !== t) el.textContent = t;
    };
    const a = animate(shownRef.current.done, done, {
      ...opts,
      onUpdate: (v) => write(doneRef.current, (shownRef.current.done = v)),
    });
    const b = animate(shownRef.current.pct, pct, {
      ...opts,
      onUpdate: (v) => write(pctRef.current, (shownRef.current.pct = v)),
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [done, pct, reduced]);

  useEffect(() => {
    onChangeRef.current?.({ subtasks: tasks, priority, status });
  }, [tasks, priority, status]);

  /* status follows completion: all done → Done, reopened → back to In Progress */
  const commitTasks = useCallback(
    (next: TaskCardSubtask[]) => {
      setTasks(next);
      const all = next.every((t) => t.done);
      if (all) setStatus("Done");
      else setStatus((s) => (s === "Done" ? "In Progress" : s));
    },
    [],
  );

  /* the tree, snapped to whole device pixels so every segment draws at the same weight.
     Its shape depends only on how many rows there are, so ticking a box never re-lays it */
  const rows = tasks.length;
  const layoutTree = useCallback(() => {
    const svg = treeRef.current;
    if (!svg) return;
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(dpr));
    const w = k / dpr;
    const o = svg.getBoundingClientRect();
    const crisp = (pos: number, origin: number) => (Math.round((origin + pos) * dpr - k / 2) + k / 2) / dpr - origin;
    const x = crisp(0.5, o.left);
    const ys = Array.from({ length: rows }, (_, i) => crisp(TREE.top + ROW.h * i + ROW.h / 2, o.top));
    const yl = ys[ys.length - 1] ?? 0;
    const r = TREE.radius;
    const next = {
      trunk: `M${x} 0V${yl - r}A${r} ${r} 0 0 0 ${x + r} ${yl}H${TREE.reach}`,
      branches: ys.slice(0, -1).map((y) => `M${x} ${y}H${TREE.reach}`),
      w,
    };
    /* only commit when a path actually moved */
    setTree((prev) =>
      prev && prev.w === next.w && prev.trunk === next.trunk && prev.branches.join() === next.branches.join() ? prev : next,
    );
  }, [rows]);

  useLayoutEffect(() => {
    layoutTree();
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layoutTree);
    });
    if (rootRef.current) ro.observe(rootRef.current);
    addEventListener("resize", layoutTree);
    document.fonts?.ready.then(() => layoutTree());
    let mq: MediaQueryList | null = null;
    const watch = () => {
      mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onScale, { once: true });
    };
    const onScale = () => {
      layoutTree();
      watch();
    };
    watch();
    /* the card slides in; place the tree again where it lands */
    const t = setTimeout(layoutTree, 700);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener("resize", layoutTree);
      mq?.removeEventListener("change", onScale);
      clearTimeout(t);
    };
  }, [layoutTree]);

  /* menus close on a press outside or Escape */
  useEffect(() => {
    if (!openKey) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!rootRef.current?.contains(t) || !t.closest?.("[data-dd]")) setOpenKey(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenKey(null);
      if (openKey === "more") moreRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [openKey]);

  useEffect(() => {
    if (openKey === "more") moreMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [openKey]);

  const enter = (i: number) => ({
    initial: reduced ? false : ({ opacity: 0, y: 5 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { ...SOFT, opacity: { duration: 0.35, ease: EASE_OUT, delay: 0.08 + i * 0.035 }, delay: 0.08 + i * 0.035 },
  });

  const moreKey = (e: ReactKeyboardEvent) => {
    const step = ({ ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const items = Array.from(moreMenuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + step + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="ptask" data-theme={theme}>
      <motion.section
        className="ptask__card"
        aria-label={title}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SOFT, opacity: { duration: 0.35, ease: EASE_OUT } }}
      >
        {/* header */}
        <motion.header className="ptask__head" {...enter(0)}>
          <div className="ptask__brand">
            <span className="ptask__logo" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                <path d="M12 2.6l8.15 4.7v9.4L12 21.4l-8.15-4.7V7.3z" />
                <circle cx="12" cy="12" r="3.4" />
              </svg>
            </span>
            <h3 className="ptask__title">{title}</h3>
          </div>

          <div className="ptask__dd" data-dd>
            <button
              ref={moreRef}
              type="button"
              className="ptask__icon"
              aria-haspopup="menu"
              aria-expanded={openKey === "more"}
              aria-label="More options"
              onClick={() => setOpenKey((k) => (k === "more" ? null : "more"))}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            <AnimatePresence>
              {openKey === "more" && (
                <motion.div
                  ref={moreMenuRef}
                  className="ptask__menu ptask__menu--right"
                  role="menu"
                  aria-label="More options"
                  onKeyDown={moreKey}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING, opacity: { duration: 0.14, ease: "easeOut" } } }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.1, ease: "easeIn" } }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="ptask__item"
                    onClick={() => {
                      commitTasks(tasks.map((t) => ({ ...t, done: true })));
                      setOpenKey(null);
                      moreRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="ptask__itemIcon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                    </svg>
                    Mark all complete
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="ptask__item"
                    onClick={() => {
                      commitTasks(subtasks.map((t) => ({ ...t })));
                      setOpenKey(null);
                      moreRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="ptask__itemIcon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Reset subtasks
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* progress */}
        <motion.div className="ptask__progressRow" {...enter(1)}>
          <div
            className="ptask__progress"
            role="progressbar"
            aria-label="Subtask progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <svg viewBox="0 0 24 24" className="ptask__progressIcon" data-done={allDone || undefined} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9.2" />
              <path d="m8.4 12.3 2.5 2.5 4.8-5" />
            </svg>
            <span className="ptask__count">
              <span ref={doneRef}>0</span> of {total}
            </span>
            <span className="ptask__track">
              <motion.span
                className="ptask__bar"
                initial={{ width: "0%" }}
                animate={{ width: `${pct}%` }}
                transition={reduced ? { duration: 0 } : { ...SOFT, delay: first.current ? 0.25 : 0 }}
              />
            </span>
            <span className="ptask__pct">
              <span ref={pctRef}>0</span>%
            </span>
          </div>
        </motion.div>

        {/* subtasks, hung off one connector tree */}
        <ul className="ptask__tasks" aria-label="Subtasks">
          <svg
            ref={treeRef}
            className="ptask__tree"
            width={TREE.reach}
            height={TREE.top + ROW.h * tasks.length}
            aria-hidden
          >
            {tree && (
              <>
                <motion.path
                  className="ptask__line"
                  d={tree.trunk}
                  strokeWidth={tree.w}
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.14 }}
                />
                {tree.branches.map((d, i) => (
                  <motion.path
                    key={i}
                    className="ptask__line"
                    d={d}
                    strokeWidth={tree.w}
                    initial={reduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.22 + i * 0.06 }}
                  />
                ))}
              </>
            )}
          </svg>
          {tasks.map((t, i) => (
            <li key={`${uid}-${i}`} className="ptask__task">
              <motion.button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                className="ptask__row"
                style={{ left: ROW.x, paddingLeft: ROW.pad }}
                onClick={() => commitTasks(tasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                {...enter(2 + i)}
              >
                <Check done={t.done} delay={first.current ? 0.3 + i * 0.05 : 0} reduced={reduced} />
                <span className="ptask__label">{t.label}</span>
              </motion.button>
            </li>
          ))}
        </ul>

        {/* properties */}
        <div className="ptask__props">
          <motion.div className="ptask__prop" {...enter(2 + tasks.length)}>
            <span className="ptask__propName">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path className="ptask__iconFill" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <path d="M4 22v-7" />
              </svg>
              Priority
            </span>
            <PillSelect
              label="Priority"
              value={priority}
              options={PRIORITY}
              open={openKey === "priority"}
              onOpen={() => setOpenKey("priority")}
              onClose={() => setOpenKey(null)}
              onPick={setPriority}
              reduced={reduced}
            />
          </motion.div>

          <motion.div className="ptask__prop" {...enter(3 + tasks.length)}>
            <span className="ptask__propName">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 22h14M5 2h14" />
                <path className="ptask__iconFill" d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
                <path className="ptask__iconFill" d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
              </svg>
              Status
            </span>
            <PillSelect
              label="Status"
              value={status}
              options={STATUS}
              open={openKey === "status"}
              onOpen={() => setOpenKey("status")}
              onClose={() => setOpenKey(null)}
              onPick={setStatus}
              reduced={reduced}
            />
          </motion.div>
        </div>

        {/* assignees */}
        <ul className="ptask__people" aria-label="Assignees">
          {people.map((p, i) => (
            <motion.li key={p.name} className="ptask__person" {...enter(4 + tasks.length + i)}>
              <span className="ptask__avatar" style={{ background: p.color ?? "#e4e4e7" }}>
                {p.avatar && !failed.has(i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" width={27} height={27} src={p.avatar} onError={() => setFailed((s) => new Set(s).add(i))} />
                ) : (
                  p.name[0]
                )}
              </span>
              {p.name}
            </motion.li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
