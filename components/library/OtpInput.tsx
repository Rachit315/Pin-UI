"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import "./otp-input.css";

/* ------------------------------------------------------------------ props -- */

export type OtpInputProps = {
  /** How many digits. A dash splits the row in half. */
  length?: number;
  /**
   * The code that passes. Ignored when `verify` is given — use that to check
   * against a server.
   */
  code?: string;
  /** Your own check: resolve `true` to pass, `false` to crack the eggs. */
  verify?: (value: string) => boolean | Promise<boolean>;
  /** "light" eggs on white, or "dark" eggs on black. */
  theme?: "light" | "dark";
  /** The line under the row. `false` hides it. */
  hint?: React.ReactNode | false;
  /** Take the keyboard as soon as it mounts. */
  autoFocus?: boolean;
  /** A blinking caret in the egg the next digit goes into. */
  caret?: boolean;
  /** Fired once a full code has passed. */
  onSuccess?: (value: string) => void;
};

/* ---------------------------------------------------------------- motion -- */

const OUT_EASE = [0.16, 1, 0.3, 1] as const;
/** How far a digit travels in or out. */
const TRAVEL = 30;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/*
 * The geometry: one jagged line down the middle of the egg, used for both
 * halves' clip paths and for the crack's stroke — so an egg always splits
 * exactly where it cracked. It is drawn against the full-size egg; the clip
 * paths are percentages and the crack is a viewBox, so both scale with it.
 */
const W = 54;
const H = 68;
const TEETH = 15;
const AMP = 1.7;

const JAG: [number, number][] = Array.from({ length: TEETH + 1 }, (_, i) => {
  const edge = i === 0 || i === TEETH;
  const off = edge ? 0 : i % 2 ? AMP : -AMP;
  return [50 + (off / W) * 100, (i / TEETH) * 100];
});

const pct = (p: [number, number]) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`;
const CLIP_L = `polygon(0% 0%, ${JAG.map(pct).join(", ")}, 0% 100%)`;
const CLIP_R = `polygon(100% 0%, ${JAG.map(pct).join(", ")}, 100% 100%)`;
const CRACK_D = `M ${JAG.map((p) => `${((p[0] / 100) * W).toFixed(2)} ${((p[1] / 100) * H).toFixed(2)}`).join(" L ")}`;

/* slot 0 rises from below, slot 1 drops from above, and so on across */
const dirOf = (i: number) => (i % 2 === 0 ? 1 : -1);

type Cell = {
  el: HTMLDivElement;
  /* the uncut egg under the two halves — it hides their seam until they part */
  whole: HTMLDivElement;
  halves: HTMLDivElement[];
  digits: HTMLSpanElement[];
  crack: SVGSVGElement;
  path: SVGPathElement;
  ends: ({ x: number; y: number; rotate: number } | null)[];
};

type Status = "idle" | "ok" | "err";

/* -------------------------------------------------------------- component -- */

/**
 * A one-time-code field made of eggs.
 *
 * Each egg is two clipped copies of the same shape, split along one jagged
 * line. Digits rise into the even slots and drop into the odd ones. A right
 * code makes the row hop; a wrong one is refused with a shake, then the crack
 * draws itself down every shell, the shells quiver, hinge open along it and
 * tumble away along crossing diagonals before coming back together, empty.
 *
 * One invisible input owns the keyboard (and the platform's one-time-code
 * autofill); the eggs only draw what it holds.
 */
export default function OtpInput({
  length = 6,
  code = "123456",
  verify,
  theme = "light",
  hint,
  autoFocus = false,
  caret = true,
  onSuccess,
}: OtpInputProps) {
  const size = Math.max(2, Math.min(10, Math.round(length)));
  const half = Math.ceil(size / 2);

  const rowRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const cellsRef = useRef<Cell[]>([]);

  const valueRef = useRef("");
  const lockedRef = useRef(false);
  const statusRef = useRef<Status>("idle");
  const aliveRef = useRef(true);
  const [status, setStatus] = useState<Status>("idle");

  const verifyRef = useRef(verify);
  verifyRef.current = verify;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  function paintStates() {
    const focused = typeof document !== "undefined" && document.activeElement === fieldRef.current;
    cellsRef.current.forEach((c, i) => {
      const s = statusRef.current;
      c.el.dataset.state =
        s === "ok" ? "ok" : s === "err" ? "err" : i === valueRef.current.length && focused ? "focus" : "idle";
      /* whether this slot has its digit yet — the caret only shows in an empty one */
      c.el.dataset.filled = String(i < valueRef.current.length);
    });
  }

  function setPhase(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function showDigit(i: number, char: string, delay = 0) {
    const c = cellsRef.current[i];
    if (!c) return;
    const from = dirOf(i) * TRAVEL;
    c.digits.forEach((d) => {
      d.textContent = char;
      animate(
        d,
        { y: [from, 0], opacity: [0, 1], filter: ["blur(5px)", "blur(0px)"] },
        { duration: 0.46, delay, ease: OUT_EASE },
      );
    });
    animate(c.el, { scale: [0.93, 1.05, 1] }, { duration: 0.48, delay, ease: OUT_EASE });
  }

  function hideDigit(i: number) {
    const c = cellsRef.current[i];
    if (!c) return;
    const to = dirOf(i) * TRAVEL;
    c.digits.forEach((d) => {
      animate(d, { y: [0, to], opacity: [1, 0], filter: ["blur(0px)", "blur(5px)"] }, { duration: 0.26, ease: "easeIn" });
      setTimeout(() => {
        /* only if nothing was typed back into this slot meanwhile */
        if (valueRef.current.length <= i) d.textContent = "";
      }, 250);
    });
    animate(c.el, { scale: [1, 0.94, 1] }, { duration: 0.3, ease: OUT_EASE });
  }

  function clearDigit(i: number) {
    cellsRef.current[i]?.digits.forEach((d) => {
      d.textContent = "";
      d.style.opacity = "0";
      d.style.transform = "translateY(0px)";
      d.style.filter = "none";
    });
  }

  function reset() {
    valueRef.current = "";
    if (fieldRef.current) fieldRef.current.value = "";
    setPhase("idle");
    lockedRef.current = false;
    cellsRef.current.forEach((c, i) => {
      clearDigit(i);
      c.whole.style.opacity = "";
    });
    paintStates();
    fieldRef.current?.focus({ preventScroll: true });
  }

  async function succeed(value: string) {
    setPhase("ok");
    lockedRef.current = true;
    paintStates();
    cellsRef.current.forEach((c, i) =>
      animate(c.el, { y: [0, -10, 0], scale: [1, 1.06, 1] }, { duration: 0.6, delay: i * 0.055, ease: OUT_EASE }),
    );
    onSuccessRef.current?.(value);
    await wait(1600);
    if (aliveRef.current) reset();
  }

  /* the shells crack, hinge open, then tumble away along crossing diagonals */
  async function fail() {
    setPhase("err");
    lockedRef.current = true;
    paintStates();
    const cells = cellsRef.current;
    const last = cells.length - 1;
    const row = rowRef.current;

    /* 1 — a heavy refusal shake */
    if (row) animate(row, { x: [0, -13, 12, -10, 8, -5, 3, 0] }, { duration: 0.66, ease: "easeInOut" });
    await wait(300);
    if (!aliveRef.current) return;

    /* 2 — the crack draws itself down each shell, left to right */
    cells.forEach((c, i) => {
      const len = c.path.getTotalLength();
      c.path.style.strokeWidth = "1.25";
      c.path.style.strokeDasharray = String(len);
      c.path.style.strokeDashoffset = String(len);
      c.crack.style.opacity = "1";
      animate(c.path, { strokeDashoffset: [len, 0] }, { duration: 0.54, delay: i * 0.08, ease: [0.4, 0, 0.25, 1] });
    });
    await wait(540 + last * 80 + 140);
    if (!aliveRef.current) return;

    /* 3 — the tension beat: the shells quiver and the crack widens */
    cells.forEach((c, i) => {
      animate(c.el, { scale: [1, 1.045, 1.015], x: [0, -1.4, 1.4, -0.9, 0] }, { duration: 0.46, delay: i * 0.02, ease: "easeInOut" });
      animate(c.path, { strokeWidth: [1.25, 2.3] }, { duration: 0.46, delay: i * 0.02, ease: "easeOut" });
    });
    await wait(500);
    if (!aliveRef.current) return;

    /* 4 — the two halves hinge open along the crack */
    cells.forEach((c, i) => {
      const [L, R] = c.halves;
      /* from here on the egg is two pieces; the uncut one under them steps out */
      c.whole.style.opacity = "0";
      const o = { duration: 0.38, delay: i * 0.035, ease: [0.2, 0.9, 0.3, 1] as const };
      animate(L, { x: [0, -3.5], rotate: [0, -7] }, o);
      animate(R, { x: [0, 3.5], rotate: [0, 7] }, o);
      animate(c.path, { opacity: [1, 0.35] }, { duration: 0.38, delay: i * 0.035, ease: "easeOut" });
    });
    await wait(430);
    if (!aliveRef.current) return;

    /* 5 — they break away: out along an X, then down under gravity */
    cells.forEach((c, i) => {
      const up = i % 2 === 0 ? -1 : 1;
      const push = 46 + i * 7;
      const [L, R] = c.halves;
      const o = { duration: 1.15, delay: i * 0.05, ease: [0.3, 0, 0.55, 1] as const };
      animate(L, { x: [-3.5, -push * 0.62, -push], y: [0, up * 20, 104], rotate: [-7, up * -22, -56], scale: [1, 1, 0.9], opacity: [1, 1, 0] }, o);
      animate(R, { x: [3.5, push * 0.62, push], y: [0, -up * 20, 104], rotate: [7, up * 22, 56], scale: [1, 1, 0.9], opacity: [1, 1, 0] }, o);
      c.ends = [{ x: -push, y: 104, rotate: -56 }, { x: push, y: 104, rotate: 56 }];
      animate(c.crack, { opacity: [1, 0] }, { duration: 0.5, delay: i * 0.05, ease: "easeOut" });
    });
    await wait(1150 + last * 50 + 260);
    if (!aliveRef.current) return;

    /* 6 — the shells come back together, empty */
    cells.forEach((c, i) => {
      clearDigit(i);
      c.crack.style.opacity = "0";
      c.path.style.strokeWidth = "1.25";
      c.path.style.opacity = "1";
      c.halves.forEach((h, k) => {
        const e = c.ends[k] ?? { x: 0, y: 0, rotate: 0 };
        animate(h, { x: [e.x, 0], y: [e.y, 0], rotate: [e.rotate, 0], scale: [0.9, 1], opacity: [0, 1] }, { duration: 0.78, delay: i * 0.05, ease: OUT_EASE });
      });
      c.ends = [null, null];
    });
    await wait(1080);
    if (aliveRef.current) reset();
  }

  async function check(value: string) {
    let ok: boolean;
    try {
      ok = verifyRef.current ? await verifyRef.current(value) : value === code;
    } catch {
      ok = false;
    }
    if (!aliveRef.current) return;
    if (ok) void succeed(value);
    else void fail();
  }

  function onInput() {
    const field = fieldRef.current;
    if (!field) return;
    if (lockedRef.current) {
      field.value = valueRef.current;
      return;
    }
    const prev = valueRef.current;
    const next = field.value.replace(/\D/g, "").slice(0, size);
    field.value = next;
    if (next === prev) return;

    if (next.length > prev.length) {
      for (let i = prev.length; i < next.length; i += 1) showDigit(i, next[i] ?? "", (i - prev.length) * 0.06);
    } else {
      for (let i = next.length; i < prev.length; i += 1) hideDigit(i);
    }

    valueRef.current = next;
    paintStates();

    if (next.length === size) {
      lockedRef.current = true;
      setTimeout(() => {
        if (aliveRef.current) void check(next);
      }, 340);
    }
  }

  /* collect the eggs, and bring the row in — before the first paint, so nothing flashes */
  useLayoutEffect(() => {
    aliveRef.current = true;
    const row = rowRef.current;
    if (!row) return;
    cellsRef.current = Array.from(row.querySelectorAll<HTMLDivElement>(".potp__cell")).map((el) => ({
      el,
      whole: el.querySelector<HTMLDivElement>(".potp__whole") as HTMLDivElement,
      halves: Array.from(el.querySelectorAll<HTMLDivElement>(".potp__half")),
      digits: Array.from(el.querySelectorAll<HTMLSpanElement>(".potp__digit")),
      crack: el.querySelector<SVGSVGElement>(".potp__crack") as SVGSVGElement,
      path: el.querySelector<SVGPathElement>(".potp__crack path") as SVGPathElement,
      ends: [null, null],
    }));

    cellsRef.current.forEach((c, i) =>
      animate(c.el, { y: [14, 0], opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.6, delay: 0.05 + i * 0.06, ease: OUT_EASE }),
    );
    if (hintRef.current) {
      animate(hintRef.current, { y: [10, 0], opacity: [0, 1] }, { duration: 0.6, delay: 0.5, ease: OUT_EASE });
    }

    if (autoFocus) fieldRef.current?.focus({ preventScroll: true });
    paintStates();

    return () => {
      aliveRef.current = false;
    };
    /* the row is built once per length */
  }, [size, autoFocus]);

  const defaultHint = (
    <>
      Enter <span className="potp__hintStrong">{code}</span> to pass.
    </>
  );

  return (
    <div className="potp" data-theme={theme}>
      <div
        className="potp__stage"
        onMouseDown={(event) => {
          /* anywhere on the row puts the caret in the field */
          event.preventDefault();
          fieldRef.current?.focus({ preventScroll: true });
        }}
      >
        <div ref={rowRef} className="potp__row">
          {Array.from({ length: size }, (_, i) => (
            <span key={i} className="potp__slot">
              {i === half && (
                <span className="potp__sep" aria-hidden="true">
                  -
                </span>
              )}
              <div className="potp__cell" data-state="idle" data-filled="false">
                {/*
                  Two clipped halves never quite meet: antialiasing leaves a
                  hairline along the crack. An uncut egg drawn under them fills
                  it, and is taken away only when the halves come apart.
                */}
                <div className="potp__whole" aria-hidden="true">
                  <div className="potp__egg">
                    <span className="potp__digit" />
                  </div>
                </div>
                {[CLIP_L, CLIP_R].map((clip, k) => (
                  <div key={k} className="potp__half" style={{ clipPath: clip }}>
                    <div className="potp__egg">
                      <span className="potp__digit" />
                    </div>
                  </div>
                ))}
                <svg className="potp__crack" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                  <path d={CRACK_D} />
                </svg>
                {caret && <span className="potp__caret" aria-hidden="true" />}
              </div>
            </span>
          ))}
        </div>

        <input
          ref={fieldRef}
          className="potp__field"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={size}
          aria-label="One-time passcode"
          spellCheck={false}
          onInput={onInput}
          onFocus={paintStates}
          onBlur={paintStates}
        />
      </div>

      {hint !== false && (
        <p ref={hintRef} className="potp__hint" role="status" aria-live="polite">
          {status === "ok" ? (
            <span className="potp__hintOk">Verified.</span>
          ) : status === "err" ? (
            <span className="potp__hintErr">Wrong code.</span>
          ) : (
            (hint ?? defaultHint)
          )}
        </p>
      )}
    </div>
  );
}
