"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";

/**
 * The stage's toolbar: shrink, source and — for a component that makes
 * sound — the speaker.
 *
 * One highlight glides under the pointer from button to button rather than
 * each square switching itself on and off, and one tooltip rides above it the
 * same way, appearing after a short pause and then following without one. A
 * press dips only the icon, so the bar never shifts. The two panels the bar
 * opens wear the pin's red while they are open, on a faint red chip; the
 * speaker is a plain toggle whose icon says whether it is on, so the bar is
 * never red just because sound is on. Every inset is the same 3px, so the
 * highlight sits exactly in its slot.
 */

export type StageBarItem = {
  id: string;
  /** What the tooltip and screen readers say, for the current state. */
  label: string;
  onClick: () => void;
  /** A toggle's state. */
  pressed: boolean;
  /** "panel" opens something and goes red while open; "toggle" only changes its icon. */
  kind: "panel" | "toggle";
  /** The icon for the current state; it swaps when `iconKey` changes. */
  icon: ReactNode;
  iconKey: string;
  /** Draw a hairline before this item, to set it apart from the ones before. */
  divided?: boolean;
};

const glide: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.7 };
const swap: Transition = { type: "spring", stiffness: 600, damping: 32 };
const TIP_DELAY = 380;

export default function StageBar({ items }: { items: StageBarItem[] }) {
  const reduced = useReducedMotion();
  const group = useId();
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [tipX, setTipX] = useState(0);
  const tipTimer = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  /* the tooltip waits a moment the first time, then follows the pointer without waiting */
  const enter = (id: string, el: HTMLElement) => {
    setHover(id);
    /* the bar is positioned, so a button's offset is its place in the bar */
    setTipX(el.offsetLeft + el.offsetWidth / 2);
    clearTimeout(tipTimer.current);
    if (tip) setTip(id);
    else tipTimer.current = window.setTimeout(() => setTip(id), TIP_DELAY);
  };
  const leave = () => {
    setHover(null);
    clearTimeout(tipTimer.current);
    setTip(null);
  };

  const tipItem = items.find((i) => i.id === tip);

  return (
    <div ref={barRef} className="wbbar" role="toolbar" aria-label="Stage" onPointerLeave={leave}>
      {items.map((item) => (
        <div key={item.id} className="wbbar__slot">
          {item.divided && <span className="wbbar__rule" aria-hidden="true" />}
          <motion.button
            type="button"
            className="wbbar__button"
            data-kind={item.kind}
            aria-pressed={item.pressed}
            aria-label={item.label}
            onClick={() => {
              item.onClick();
              /* a click answers the question the tooltip was asking */
              clearTimeout(tipTimer.current);
              setTip(null);
            }}
            onPointerEnter={(e) => e.pointerType === "mouse" && enter(item.id, e.currentTarget)}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && enter(item.id, e.currentTarget)}
            onBlur={leave}
            whileTap={reduced ? undefined : "press"}
          >
            {/* an open panel's chip */}
            <span className="wbbar__on" data-on={(item.kind === "panel" && item.pressed) || undefined} aria-hidden="true" />
            {/* the one highlight, gliding to whichever button the pointer is over */}
            {hover === item.id && (
              <motion.span
                className="wbbar__hover"
                layoutId={`wbbar-hover-${group}`}
                transition={reduced ? { duration: 0 } : glide}
                aria-hidden="true"
              />
            )}
            <motion.span className="wbbar__icon" variants={{ press: { scale: 0.86 } }} transition={swap}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={item.iconKey}
                  className="wbbar__glyph"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 45 }}
                  transition={swap}
                >
                  {item.icon}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          </motion.button>
        </div>
      ))}

      {/* one tooltip, riding above the bar to whichever button it names */}
      <AnimatePresence>
        {tipItem && (
          <motion.span
            key="tip"
            className="wbbar__tip"
            role="tooltip"
            style={{ x: "-50%" }}
            initial={reduced ? { opacity: 0, left: tipX } : { opacity: 0, y: 4, scale: 0.96, left: tipX }}
            animate={{ opacity: 1, y: 0, scale: 1, left: tipX }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96, transition: { duration: 0.12 } }}
            transition={reduced ? { duration: 0 } : { ...glide, opacity: { duration: 0.14 } }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={tipItem.label}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14 }}
              >
                {tipItem.label}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
