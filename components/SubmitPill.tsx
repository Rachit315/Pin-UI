"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Chevrons from "./Chevrons";
import { softSpring, spring } from "@/lib/motion";

const CHIP = 32;
const INSET = 6;
/** How far along the pill the puck has to get before the drag counts. */
const COMMIT = 0.62;

/**
 * The black pill, with the white puck as a drag handle.
 *
 * Drag the puck to the far end to join — past ~62% it commits and carries on to
 * the end; short of that it springs back. Clicking the button still submits, so
 * the gesture is an alternative rather than the only way through. Hover or
 * keyboard focus nudges the puck forward to advertise that it moves.
 */
export default function SubmitPill({
  pending,
  label,
  onConfirm,
}: {
  pending: boolean;
  label: string;
  /** Runs the same submit as a click; resolves false if it did not go through. */
  onConfirm: () => Promise<boolean>;
}) {
  const reduced = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const draggedRef = useRef(false);

  const [travel, setTravel] = useState(0);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const x = useMotionValue(0);
  const span = Math.max(travel * COMMIT, 1);
  const labelOpacity = useTransform(x, [0, span], [1, 0]);
  const trailWidth = useTransform(x, (value) => CHIP + value);

  /* How far the puck can slide before it meets the right inset. */
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const measure = () =>
      setTravel(Math.max(0, button.offsetWidth - CHIP - INSET * 2));

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  /* Wherever the puck has been left, ease it to where it belongs. Re-runs when
     the drag ends, so releasing short of the threshold springs it home. */
  useEffect(() => {
    if (dragging) return;
    const target =
      pending || confirmed ? travel : active && !reduced ? 5 : 0;
    const controls = animate(x, target, softSpring);
    return () => controls.stop();
  }, [dragging, pending, confirmed, active, reduced, travel, x]);

  async function onDragEnd() {
    setDragging(false);
    if (x.get() < travel * COMMIT) return;

    setConfirmed(true);
    const ok = await onConfirm();
    if (!ok) setConfirmed(false);
  }

  const locked = pending || confirmed;

  return (
    <motion.button
      ref={buttonRef}
      type="submit"
      className="submit"
      disabled={locked}
      whileTap={reduced || locked || dragging ? undefined : { scale: 0.985 }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClickCapture={(event) => {
        /* a release at the end of a drag must not read as a click */
        if (draggedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }
      }}
    >
      {/* the track lit up behind the puck as it travels */}
      <motion.span
        className="submit__trail"
        aria-hidden="true"
        style={{ width: trailWidth }}
      />

      <motion.span
        className="submit__chip"
        data-join-token=""
        aria-hidden="true"
        style={{ x }}
        drag={locked || reduced ? false : "x"}
        dragConstraints={{ left: 0, right: travel }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragStart={() => {
          draggedRef.current = true;
          setDragging(true);
        }}
        onDragEnd={onDragEnd}
        animate={{ scaleX: dragging ? 1.08 : active && !reduced ? 1.06 : 1 }}
        transition={softSpring}
      >
        <motion.span
          className="submit__chipSpin"
          animate={pending && !reduced ? { rotate: 360 } : { rotate: 0 }}
          transition={
            pending && !reduced
              ? { duration: 1.1, repeat: Infinity, ease: "linear" }
              : spring
          }
        >
          <Chevrons className="submit__chevrons" />
        </motion.span>
      </motion.span>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="submit__label"
          style={{ opacity: labelOpacity }}
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          exit={{ y: -8, opacity: 0 }}
          transition={spring}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
