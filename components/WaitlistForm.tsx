"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Consent from "./Consent";
import Field from "./Field";
import SubmitPill from "./SubmitPill";
import WelcomePanel from "./WelcomePanel";
import { exitSpring, softSpring, spring } from "@/lib/motion";
import { playConfirm, primeSound } from "@/lib/sound";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Invalid = "email" | "handle" | "consent" | null;

/**
 * The form reveals itself a row at a time (Figma 233:94 -> 240:35 -> 240:55):
 * it opens as a single email field, focusing that drops the X handle in, and
 * focusing the handle drops the consent line in. The block stays centred in the
 * viewport throughout — `layout` re-centres it as it grows rather than letting
 * it push downward.
 */
export default function WaitlistForm({
  onJoined,
}: {
  /** Fires once the signup lands, so the stage can clear the card strip. */
  onJoined?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [consent, setConsent] = useState(false);
  const [invalid, setInvalid] = useState<Invalid>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  /** Rows only ever open, never close, so focus cannot make the form jump. */
  const reveal = (next: number) => setStep((value) => Math.max(value, next));

  /**
   * Shared by the button click and the drag gesture. Resolves false when the
   * signup did not go through, so the puck can spring back.
   */
  async function submit(): Promise<boolean> {
    if (pending || done) return false;

    if (!EMAIL_RE.test(email.trim())) {
      setInvalid("email");
      setMessage("Enter a valid email address.");
      return false;
    }
    /* The later rows are required, so open them rather than fail silently. */
    if (step < 1) {
      reveal(1);
      setInvalid("handle");
      setMessage("Your X/Twitter handle is required.");
      return false;
    }
    if (!handle.trim()) {
      setInvalid("handle");
      setMessage("Your X/Twitter handle is required.");
      return false;
    }
    if (step < 2) {
      reveal(2);
      setInvalid("consent");
      setMessage("Tick the box so we can tag you on launch.");
      return false;
    }
    if (!consent) {
      setInvalid("consent");
      setMessage("Tick the box so we can tag you on launch.");
      return false;
    }

    setInvalid(null);
    setMessage("");
    setPending(true);
    /* open the audio context now, while the click is still counted as user
       activation — Safari will refuse a sound played after the await */
    primeSound();

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), handle: handle.trim() }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Something went wrong.");
      }

      playConfirm();
      setDone(true);
      onJoined?.();
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    /* mode="wait" so the form is gone before the pass is issued: the two share
       the centre of the stage, and letting them overlap would have them fight
       over the same space on the way through. */
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="welcome" className="centre" initial={false}>
          <WelcomePanel email={email.trim()} handle={handle.trim()} />
        </motion.div>
      ) : (
        <motion.form
          key="form"
          className="form"
          layout
          onSubmit={onSubmit}
          noValidate
          transition={softSpring}
          initial={false}
          /* lifts and blurs away, quickly and without a bounce, so the pass
             lands in an empty stage */
          exit={{
            opacity: 0,
            y: -22,
            scale: 0.97,
            filter: "blur(8px)",
            transition: exitSpring,
          }}
        >
          <motion.div layout="position" transition={softSpring}>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              invalid={invalid === "email"}
              disabled={pending}
              onFocus={() => reveal(1)}
              onChange={(value) => {
                setEmail(value);
                if (invalid === "email") setInvalid(null);
              }}
            />
          </motion.div>

          <AnimatePresence initial={false}>
            {step >= 1 && (
              <motion.div
                key="handle"
                className="form__row"
                initial={{ opacity: 0, height: 0, y: -14 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -14 }}
                transition={softSpring}
              >
                <Field
                  label="X/Twitter @handle"
                  raw
                  value={handle}
                  invalid={invalid === "handle"}
                  disabled={pending}
                  onFocus={() => reveal(2)}
                  onChange={(value) => {
                    setHandle(value);
                    if (invalid === "handle") setInvalid(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {step >= 2 && (
              <motion.div
                key="consent"
                className="form__row form__row--consent"
                initial={{ opacity: 0, height: 0, y: -14 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -14 }}
                transition={softSpring}
              >
                <motion.div
                  animate={
                    invalid === "consent" ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }
                  }
                  transition={
                    invalid === "consent"
                      ? { duration: 0.42, ease: "easeInOut" }
                      : spring
                  }
                >
                  <Consent
                    checked={consent}
                    disabled={pending}
                    onToggle={() => {
                      setConsent((value) => !value);
                      if (invalid === "consent") setInvalid(null);
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="form__action" layout="position" transition={softSpring}>
            <SubmitPill
              pending={pending}
              label={pending ? "Joining" : "Join Waitlist"}
              onConfirm={submit}
            />

            <p
              className="status"
              data-tone={message ? "error" : "neutral"}
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
                    style={{ display: "inline-block" }}
                  >
                    {message}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </p>
          </motion.div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
