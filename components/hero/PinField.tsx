"use client";

import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import UpdatesForm from "./UpdatesForm";

/**
 * The board in the footer: a field of pushpins, every one of them turning so
 * that its point aims at the cursor, with the updates field pinned in the
 * middle.
 *
 * Geometry is in the page's own `em`, so the pins are the same size as the
 * rest of the type system and the grid is simply however many fit. Pins that
 * would sit under the form are left out rather than drawn behind it, which is
 * what opens the gap the form sits in.
 *
 * The motion is a spring per pin, on the angle alone, run from one animation
 * frame loop that only exists while something is moving:
 *
 * - the target is the angle that puts the pin's point on the cursor, taken the
 *   short way round, so a pin never spins the long way to get there;
 * - each spring is slightly under-damped, so a pin swings past and settles
 *   instead of stopping dead — the weight is what makes it read as a real pin;
 * - pins further from the cursor are a little slower, so a movement crosses
 *   the board as a wave rather than every pin snapping at once;
 * - when the cursor leaves, every pin swings back to hanging straight down.
 *
 * Transforms are written straight to each pin's style — 50-odd pins at 60fps
 * through React state would re-render the footer every frame for nothing.
 */

/* The pin, in `em` of the footer. The art is 120 × 267, point at the bottom. */
const PIN_W = 3;
const PIN_H = PIN_W * (267 / 120);
const PITCH_X = 7;
const PITCH_Y = 7.9;
/* the least room between the outermost pins and the board's edge */
const MARGIN_X = 2.2;
const MARGIN_Y = 1.1;
/* the point the pin turns about: its centre of mass, 40% of the way down */
const PIVOT_Y = 0.4;

/* the spring, per pin */
const STIFFNESS = 190;
const DAMPING = 19;
/* how much slower the farthest pins are than the nearest, and over what reach */
const LAG = 0.45;
const LAG_REACH = 720;

type Pin = { key: string; x: number; y: number; delay: number };

type Live = {
  el: HTMLElement;
  /* the pivot, relative to the field */
  px: number;
  py: number;
  angle: number;
  velocity: number;
};

export default function PinField() {
  const reduced = useReducedMotion();
  const fieldRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [arrived, setArrived] = useState(false);

  const liveRef = useRef<Live[]>([]);
  /* the cursor relative to the field, or null when it is not on it */
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const releaseRef = useRef<number | null>(null);
  /* the pin's width in px, for the loop, which must not read a stale render */
  const pinWRef = useRef(0);

  /* lay the board out: however many pins fit, centred, minus the ones under the form */
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const form = formRef.current;
    if (!field || !form) return;

    const layout = () => {
      const em = parseFloat(getComputedStyle(field).fontSize) || 14;
      const W = field.clientWidth;
      const H = field.clientHeight;
      const pinW = PIN_W * em;
      const pinH = PIN_H * em;
      const pitchX = PITCH_X * em;
      const pitchY = PITCH_Y * em;

      /* never closer to the border than this, so the outer pins have air too */
      const marginX = MARGIN_X * em;
      const marginY = MARGIN_Y * em;
      const cols = Math.max(1, Math.floor((W - 2 * marginX - pinW) / pitchX) + 1);
      const rows = Math.max(1, Math.floor((H - 2 * marginY - pinH) / pitchY) + 1);
      /* the leftover space is shared evenly around the grid, so it is centred */
      const offX = (W - ((cols - 1) * pitchX + pinW)) / 2;
      const offY = (H - ((rows - 1) * pitchY + pinH)) / 2;

      const box = field.getBoundingClientRect();
      /*
       * The bar alone opens the gap — one row, as drawn. The status line under
       * it is sized to fit in the air between that row and the next.
       */
      const hole = (form.querySelector(".upd__bar") ?? form).getBoundingClientRect();
      /* a little clearance, so no pin looks as if it is touching the form */
      const clear = em * 0.9;
      const hx0 = hole.left - box.left - clear;
      const hx1 = hole.right - box.left + clear;
      const hy0 = hole.top - box.top - clear;
      const hy1 = hole.bottom - box.top + clear;

      const next: Pin[] = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const x = offX + c * pitchX;
          const y = offY + r * pitchY;
          const under = x < hx1 && x + pinW > hx0 && y < hy1 && y + pinH > hy0;
          if (under) continue;
          /* the entrance runs corner to corner, a diagonal at a time */
          next.push({ key: `${r}-${c}`, x, y, delay: (r + c) * 32 });
        }
      }

      setPins(next);
      setSize({ w: pinW, h: pinH });
      pinWRef.current = pinW;
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(field);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  /* collect the pins that were just drawn, keeping any angle they already had */
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const previous = new Map(liveRef.current.map((p) => [p.el.dataset.key, p]));
    liveRef.current = Array.from(field.querySelectorAll<HTMLElement>(".pinf__pin")).map(
      (el) => {
        const pin = el.parentElement as HTMLElement;
        const old = previous.get(el.dataset.key);
        return {
          el,
          px: pin.offsetLeft + pin.offsetWidth / 2,
          py: pin.offsetTop + pin.offsetHeight * PIVOT_Y,
          angle: old?.angle ?? 0,
          velocity: old?.velocity ?? 0,
        };
      },
    );
    /* a relayout mid-swing picks up where it was; `wake` only reads refs */
    if (liveRef.current.some((p) => p.angle !== 0)) wake();
  }, [pins]);

  /* the pins press in once, the first time the board comes into view */
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setArrived(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setArrived(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(field);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (releaseRef.current !== null) window.clearTimeout(releaseRef.current);
    },
    [],
  );

  function step(now: number) {
    /* a long gap (a background tab) is not a long step: clamp it */
    const dt = Math.min(0.032, Math.max(0.001, (now - lastRef.current) / 1000));
    lastRef.current = now;

    const aim = aimRef.current;
    let moving = false;

    for (const pin of liveRef.current) {
      let target = 0;
      let reach = 1;

      if (aim) {
        const dx = aim.x - pin.px;
        const dy = aim.y - pin.py;
        const distance = Math.hypot(dx, dy);
        reach = 1 - LAG * Math.min(1, distance / LAG_REACH);
        /*
         * Right on top of a pin the direction is noise — a pixel either way is
         * half a turn — so inside its own head it holds its last aim.
         */
        if (distance < pinWRef.current * 0.6) {
          target = pin.angle;
        } else {
          /* 0° hangs point-down; this is the turn that puts the point on (dx, dy) */
          const want = (Math.atan2(-dx, dy) * 180) / Math.PI;
          /* the short way round, measured from wherever the pin is now */
          const delta = ((((want - pin.angle) % 360) + 540) % 360) - 180;
          target = pin.angle + delta;
        }
      } else {
        /* back to hanging, the short way — a pin that went round comes back round */
        const delta = ((((0 - pin.angle) % 360) + 540) % 360) - 180;
        target = pin.angle + delta;
      }

      const stiffness = STIFFNESS * reach;
      const damping = DAMPING * Math.sqrt(reach);
      const force = stiffness * (target - pin.angle) - damping * pin.velocity;
      pin.velocity += force * dt;
      pin.angle += pin.velocity * dt;

      if (Math.abs(pin.velocity) > 0.02 || Math.abs(target - pin.angle) > 0.02) {
        moving = true;
      } else {
        pin.velocity = 0;
        pin.angle = target;
      }

      /* kept in a small range, so the number never grows without bound */
      if (!aim && Math.abs(pin.angle) < 0.02) pin.angle = 0;
      pin.el.style.transform = `rotate(${pin.angle.toFixed(2)}deg)`;
    }

    if (moving) {
      frameRef.current = requestAnimationFrame(step);
    } else {
      /*
       * Settled: normalise, and stop the loop entirely. A cursor resting on the
       * board costs nothing — the next move wakes it again.
       */
      for (const pin of liveRef.current) {
        pin.angle = ((pin.angle % 360) + 360) % 360;
        if (pin.angle > 180) pin.angle -= 360;
      }
      frameRef.current = null;
    }
  }

  function wake() {
    if (reduced || frameRef.current !== null) return;
    lastRef.current = performance.now();
    frameRef.current = requestAnimationFrame(step);
  }

  function aimAt(event: React.PointerEvent<HTMLDivElement>) {
    const field = fieldRef.current;
    if (!field) return;
    const box = field.getBoundingClientRect();
    /* the pins are measured from inside the border, so the aim is too */
    aimRef.current = {
      x: event.clientX - box.left - field.clientLeft,
      y: event.clientY - box.top - field.clientTop,
    };
    if (releaseRef.current !== null) {
      window.clearTimeout(releaseRef.current);
      releaseRef.current = null;
    }
    wake();
  }

  function release(afterMs = 0) {
    if (releaseRef.current !== null) window.clearTimeout(releaseRef.current);
    releaseRef.current = window.setTimeout(() => {
      aimRef.current = null;
      releaseRef.current = null;
      wake();
    }, afterMs);
  }

  return (
    <div
      ref={fieldRef}
      className="pinf"
      data-arrived={arrived ? "true" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") aimAt(event);
      }}
      onPointerMove={(event) => {
        /* a touch only steers while it is down; the page scroll takes it after that */
        if (event.pointerType !== "touch" || event.buttons) aimAt(event);
      }}
      onPointerDown={aimAt}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") release();
      }}
      onPointerUp={(event) => {
        /* on a phone the pins hold the tap's aim for a moment, then hang again */
        if (event.pointerType === "touch") release(900);
      }}
      onPointerCancel={() => release(400)}
    >
      <div className="pinf__pins" aria-hidden="true">
        {pins.map((pin) => (
          <span
            key={pin.key}
            className="pinf__slot"
            style={
              {
                left: pin.x,
                top: pin.y,
                width: size.w,
                height: size.h,
                "--pinf-delay": `${pin.delay}ms`,
              } as React.CSSProperties
            }
          >
            <span className="pinf__pin" data-key={pin.key} />
          </span>
        ))}
      </div>

      <div ref={formRef} className="pinf__form">
        <UpdatesForm />
      </div>
    </div>
  );
}
