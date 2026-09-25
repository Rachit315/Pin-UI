"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import Chevrons from "../Chevrons";
import { spring } from "@/lib/motion";
import { playConfirm, primeSound } from "@/lib/sound";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type State = "idle" | "pending" | "done";

/**
 * The red bar in the middle of the footer's board: one email field and the
 * black Enter pill.
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

  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  /* the bar shakes on a rejection — imperatively, so the field keeps its focus */
  const [barRef, animateBar] = useAnimate<HTMLFormElement>();

  function fail(text: string) {
    setInvalid(true);
    setMessage(text);
    inputRef.current?.focus();
    if (!reduced && barRef.current) {
      void animateBar(barRef.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.42, ease: "easeInOut" });
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "idle") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      fail(value ? "That email doesn't look right." : "Add your email first.");
      return;
    }

    setInvalid(false);
    setMessage("");
    setState("pending");
    /* while the click still counts as a gesture — Safari refuses sound after an await */
    primeSound();

    try {
      const response = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
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
      setState("idle");
      fail(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  const done = state === "done";

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
              disabled={state === "pending"}
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
          className="upd__go"
          type="submit"
          disabled={state !== "idle"}
          aria-label={done ? "Subscribed" : state === "pending" ? "Subscribing" : "Subscribe"}
        >
          <span className="upd__puck" aria-hidden="true">
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
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                >
                  <Chevrons className="upd__chevArt" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span className="upd__word" aria-hidden="true">
            {done ? "Done" : "Enter"}
          </span>
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
