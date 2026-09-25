"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Chevrons from "../Chevrons";
import { spring } from "@/lib/motion";
import { playConfirm, primeSound } from "@/lib/sound";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** How far along the pill the puck has to be let go for a drag to count. */
const COMMIT = 0.6;
/** The slide has to land before the tick replaces the chevrons, however fast the network is. */
const SLIDE_MS = 420;

/* A throw: quick off the mark, settling without a bounce at the far end. */
const throwSpring = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;
/* Back home, with a little give — it was let go, not put away. */
const homeSpring = { type: "spring", stiffness: 520, damping: 30, mass: 0.7 } as const;

type State = "idle" | "pending" | "done";

/**
 * The red bar in the middle of the footer's board: one email field and the
 * black Enter pill.
 *
 * The white puck in the pill is a slider. There are three ways to send, and
 * they all look the same, because they are the same action:
 *
 * - drag the puck right — let go past 60% and it carries on to the end and
 *   sends; let go short of that and it springs home;
 * - click the pill — the puck throws itself to the end, then sends;
 * - press Enter in the field — the same throw.
 *
 * The puck's position is one motion value, and where it should rest is
 * derived from the state (home, nudged on hover, or parked at the far end
 * while sending and after). Nothing has to remember to put it back: an error
 * returns the state to idle and the puck follows.
 *
 * It writes to Supabase's `updates` table through `/api/updates` — a list of
 * its own, apart from the waitlist, with its own duplicate check and rate
 * limit. Only the email is asked for here.
 */
export default function UpdatesForm() {
  const reduced = useReducedMotion();
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const puckRef = useRef<HTMLSpanElement>(null);
  /* set by a drag, so the click that ends it is not read as a second send */
  const draggedRef = useRef(false);

  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [travel, setTravel] = useState(0);
  const [puckSize, setPuckSize] = useState(0);
  /* the bar shakes on a rejection — imperatively, so the field keeps its focus */
  const [barRef, animateBar] = useAnimate<HTMLFormElement>();

  const x = useMotionValue(0);
  const span = Math.max(1, travel);
  /* "Enter" gives way as the puck slides over it */
  const wordOpacity = useTransform(x, [0, span * 0.55], [1, 0]);
  /* the track lights up behind the puck as it goes, from the puck's own width */
  const trailWidth = useTransform(x, (value) => puckSize + Math.max(0, value));

  /* how far the puck can go: the pill's width, less the puck and its inset at either end */
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const puck = puckRef.current;
    if (!pill || !puck) return;
    const measure = () => {
      setTravel(Math.max(0, pill.clientWidth - puck.offsetWidth - puck.offsetLeft * 2));
      setPuckSize(puck.offsetWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    return () => observer.disconnect();
  }, []);

  /* wherever the puck was left, ease it to where the state says it belongs */
  useEffect(() => {
    if (dragging) return;
    const parked = state !== "idle";
    const target = parked ? travel : hover && !reduced ? Math.min(4, travel) : 0;
    const controls = animate(
      x,
      target,
      reduced ? { duration: 0 } : parked ? throwSpring : homeSpring,
    );
    return () => controls.stop();
  }, [dragging, state, hover, reduced, travel, x]);

  function fail(text: string) {
    setInvalid(true);
    setMessage(text);
    inputRef.current?.focus();
    if (!reduced && barRef.current) {
      void animateBar(barRef.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.42, ease: "easeInOut" });
    }
  }

  /** The one send, whichever of the three ways it was asked for. */
  async function send() {
    if (state !== "idle") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      fail(value ? "That email doesn't look right." : "Add your email first.");
      return;
    }

    setInvalid(false);
    setMessage("");
    /* this is what throws the puck to the end */
    setState("pending");
    /* while the gesture still counts as one — Safari refuses sound after an await */
    primeSound();

    try {
      const [response] = await Promise.all([
        fetch("/api/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value }),
        }),
        new Promise((resolve) => setTimeout(resolve, reduced ? 0 : SLIDE_MS)),
      ]);
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) throw new Error(payload.message ?? "Something went wrong.");

      playConfirm();
      setMessage(
        response.status === 200
          ? "You're already on the list. Nothing more to do."
          : "You're in. New components will land in your inbox.",
      );
      setState("done");
    } catch (error) {
      /* back to idle, which brings the puck home */
      setState("idle");
      fail(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  function onDragEnd() {
    setDragging(false);
    /* short of the line: `dragging` going false is enough to spring it home */
    if (x.get() >= travel * COMMIT) void send();
  }

  const done = state === "done";
  const locked = state !== "idle";

  return (
    <div className="upd">
      <form
        ref={barRef}
        className="upd__bar"
        data-state={state}
        data-invalid={invalid ? "true" : undefined}
        onSubmit={onSubmit}
        noValidate
      >
        <label className="upd__label" htmlFor={inputId}>
          Email for new regular updates
        </label>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.p
              key="done"
              className="upd__done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
            >
              {email.trim()}
            </motion.p>
          ) : (
            <motion.input
              key="input"
              ref={inputRef}
              id={inputId}
              className="upd__input"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="Email For New Regular Updates*"
              value={email}
              readOnly={state === "pending"}
              aria-invalid={invalid || undefined}
              aria-describedby={statusId}
              onChange={(event) => {
                setEmail(event.target.value);
                if (invalid) {
                  setInvalid(false);
                  setMessage("");
                }
              }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
            />
          )}
        </AnimatePresence>

        <button
          ref={pillRef}
          className="upd__go"
          type="submit"
          data-dragging={dragging ? "true" : undefined}
          aria-disabled={locked || undefined}
          aria-label={done ? "Subscribed" : state === "pending" ? "Subscribing" : "Subscribe"}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHover(true);
          }}
          onPointerLeave={() => setHover(false)}
          onPointerDownCapture={() => {
            /* a fresh press; a drag that ended outside the pill left this set */
            draggedRef.current = false;
          }}
          onClickCapture={(event) => {
            /* the release at the end of a drag is not a click; the drag decided */
            if (draggedRef.current || locked) {
              event.preventDefault();
              event.stopPropagation();
              draggedRef.current = false;
            }
          }}
        >
          <motion.span
            className="upd__trail"
            aria-hidden="true"
            style={{ width: trailWidth }}
          />

          <motion.span
            ref={puckRef}
            className="upd__puck"
            aria-hidden="true"
            style={{ x }}
            drag={locked || reduced ? false : "x"}
            dragConstraints={{ left: 0, right: travel }}
            dragElastic={0.06}
            dragMomentum={false}
            onDragStart={() => {
              draggedRef.current = true;
              setDragging(true);
              setInvalid(false);
            }}
            onDragEnd={onDragEnd}
            whileDrag={{ scale: 1.08 }}
            transition={spring}
          >
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.svg
                  key="tick"
                  className="upd__tick"
                  viewBox="0 0 24 24"
                  fill="none"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring}
                >
                  <motion.path
                    d="M5.5 12.5l4.2 4.2 8.8-9.4"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                  />
                </motion.svg>
              ) : (
                <motion.span
                  key="go"
                  className="upd__chev"
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.16 }}
                >
                  <Chevrons className="upd__chevArt" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>

          <motion.span className="upd__word" aria-hidden="true" style={{ opacity: wordOpacity }}>
            Enter
          </motion.span>

          {/* with the puck parked on the right, the word moves to the left of it */}
          <AnimatePresence initial={false}>
            {done && (
              <motion.span
                key="done"
                className="upd__word upd__word--done"
                aria-hidden="true"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: 0.12 }}
              >
                Done
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </form>

      <p
        id={statusId}
        className="upd__status"
        data-tone={invalid ? "error" : done ? "ok" : undefined}
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          {message ? (
            <motion.span
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring}
            >
              {message}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </p>
    </div>
  );
}
