"use client";

import { useState, type FormEvent } from "react";
import { animate, AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import { Inter_Tight } from "next/font/google";
import "./contact-form.css";

/**
 * Contact Form — "Wanna Work With Me…", a black-and-white contact block.
 *
 * From the Figma frame (Contact): a light page ruled with dashed guides, a
 * headline, and two black columns — a greyscale hand reaching in on the left,
 * and the form on the right: Email, Contact and Message as black tiles with
 * white-outlined fields, then a Contact Me tile marked at its corners.
 *
 * On arrival the guides draw themselves across the page and their pins pop
 * in, the headline rises a word at a time, the photo is revealed upward as
 * the hand settles, and the tiles follow on a stagger. The fields brighten
 * on focus and shake when they are wrong. The button fills white from the
 * bottom as its label rolls over, its corner marks spread, it shows that it
 * is sending, and it turns to a drawn check once the message lands. Wire
 * `onSubmit` to your own endpoint; the demo just waits a moment.
 *
 * The frame is drawn in its own units scaled to fit the window — width and
 * height — so the whole block always sits in one viewport; a portrait tablet
 * gets a tighter frame, and a phone stacks and scrolls.
 */

const interTight = Inter_Tight({ subsets: ["latin"], weight: "400", variable: "--cf-font", display: "swap" });

const HAND = "/blocx/contact-form/hand.webp";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const TITLE = "Wanna Work With Me...";

export type ContactValues = { email: string; contact: string; message: string };

type Field = {
  name: keyof ContactValues;
  label: string;
  placeholder: string;
  type: string;
  autoComplete: string;
  inputMode?: "email" | "tel" | "text";
};

const FIELDS: Field[] = [
  { name: "email", label: "Email", placeholder: "Enter Your Email...", type: "email", autoComplete: "email", inputMode: "email" },
  { name: "contact", label: "Contact", placeholder: "Enter Your Contact...", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { name: "message", label: "Message", placeholder: "Enter Your Message...", type: "text", autoComplete: "off" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: ContactValues): Partial<Record<keyof ContactValues, string>> {
  const errors: Partial<Record<keyof ContactValues, string>> = {};
  if (!EMAIL.test(v.email.trim())) errors.email = "Enter a valid email";
  if (v.contact.trim() && !/^[+\d][\d\s().-]{5,}$/.test(v.contact.trim())) errors.contact = "Enter a valid number";
  if (v.message.trim().length < 2) errors.message = "Tell me a little about it";
  return errors;
}

const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT, delay },
  }),
};

type Status = "idle" | "sending" | "sent";

export default function ContactForm({
  onSubmit,
}: {
  /** Send the message wherever it needs to go. Left out, the demo waits a moment and says thanks. */
  onSubmit?: (values: ContactValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState<ContactValues>({ email: "", contact: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues, string>>>({});
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "idle") return;
    const found = validate(values);
    setErrors(found);
    const wrong = FIELDS.filter((f) => found[f.name]);
    if (wrong.length) {
      // every wrong tile gives a short shake; focus lands on the first
      for (const f of wrong) {
        const tile = document.getElementById(`cf-tile-${f.name}`);
        if (tile) animate(tile, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.45, ease: "easeOut" });
      }
      document.getElementById(`cf-${wrong[0].name}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      await (onSubmit ? onSubmit(values) : new Promise((r) => setTimeout(r, 1300)));
      setStatus("sent");
      setValues({ email: "", contact: "", message: "" });
      setTimeout(() => setStatus("idle"), 3200);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`cf-page ${interTight.variable}`}>
        <section className="cf" aria-labelledby="cf-title">
          {/* the guides draw themselves across the page, edge to edge */}
          <motion.span
            className="cf__rail cf__rail--h"
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, ease: EASE_OUT }}
          />
          <motion.span
            className="cf__rail cf__rail--l"
            aria-hidden
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.1 }}
          />
          <motion.span
            className="cf__rail cf__rail--r"
            aria-hidden
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.1 }}
          />

          {/* the raised pins where the guides cross */}
          {(["l", "r"] as const).map((side, i) => (
            <motion.span
              key={side}
              className={`cf__pin cf__pin--${side}`}
              aria-hidden
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.7 + i * 0.08 }}
            />
          ))}

          <div className="cf__stage">
            <h2 id="cf-title" className="cf__title" aria-label={TITLE}>
              {TITLE.split(" ").map((word, i) => (
                <span key={i} className="cf__word-mask" aria-hidden>
                  <motion.span
                    className="cf__word"
                    initial={{ y: "105%", filter: "blur(6px)" }}
                    animate={{ y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 + i * 0.07 }}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h2>

            <div className="cf__row">
              <motion.figure
                className="cf__photo"
                initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.35 }}
              >
                <motion.div
                  className="cf__hand"
                  initial={{ scale: 1.12, x: "-56%", y: "-46%" }}
                  animate={{ scale: 1, x: "-50%", y: "-50%" }}
                  transition={{ duration: 1.8, ease: EASE_OUT, delay: 0.35 }}
                >
                  <div className="cf__hand-crop">
                    <img src={HAND} alt="" width={1536} height={1024} draggable={false} />
                  </div>
                </motion.div>
              </motion.figure>

              <form className="cf__form" onSubmit={handleSubmit} noValidate aria-describedby="cf-status">
                {FIELDS.map((f, i) => (
                  <motion.div
                    key={f.name}
                    id={`cf-tile-${f.name}`}
                    className={`cf__tile${errors[f.name] ? " is-invalid" : ""}`}
                    variants={rise}
                    initial="hidden"
                    animate="show"
                    custom={0.5 + i * 0.09}
                  >
                    <label className="cf__label" htmlFor={`cf-${f.name}`}>
                      {f.label}
                    </label>
                    <input
                      id={`cf-${f.name}`}
                      className="cf__input"
                      name={f.name}
                      type={f.type}
                      inputMode={f.inputMode}
                      autoComplete={f.autoComplete}
                      placeholder={f.placeholder}
                      value={values[f.name]}
                      required={f.name !== "contact"}
                      aria-invalid={Boolean(errors[f.name])}
                      aria-describedby={errors[f.name] ? `cf-${f.name}-error` : undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => ({ ...prev, [f.name]: v }));
                        if (errors[f.name]) setErrors((prev) => ({ ...prev, [f.name]: undefined }));
                      }}
                    />
                    <AnimatePresence>
                      {errors[f.name] && (
                        <motion.span
                          id={`cf-${f.name}-error`}
                          className="cf__error"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.25, ease: EASE_OUT }}
                        >
                          {errors[f.name]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                <motion.button
                  type="submit"
                  className={`cf__submit is-${status}`}
                  variants={rise}
                  initial="hidden"
                  animate="show"
                  custom={0.77}
                  whileTap={status === "idle" ? { scale: 0.985 } : undefined}
                  aria-disabled={status !== "idle"}
                  aria-busy={status === "sending"}
                >
                  <span className="cf__fill" aria-hidden />
                  {/* the corner marks spread on hover */}
                  <span className="cf__corner cf__corner--tl" aria-hidden />
                  <span className="cf__corner cf__corner--tr" aria-hidden />
                  <span className="cf__corner cf__corner--bl" aria-hidden />
                  <span className="cf__corner cf__corner--br" aria-hidden />

                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={status}
                      className="cf__submit-face"
                      initial={{ opacity: 0, y: "70%", filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: "-70%", filter: "blur(6px)" }}
                      transition={{ duration: 0.45, ease: EASE_OUT }}
                    >
                      {status === "idle" && (
                        <span className="cf__roll">
                          <span className="cf__roll-line">Contact Me</span>
                          <span className="cf__roll-line" aria-hidden>
                            Contact Me
                            <svg className="cf__arrow" viewBox="0 0 24 24" aria-hidden>
                              <path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </span>
                      )}
                      {status === "sending" && (
                        <span className="cf__sending">
                          Sending
                          <span className="cf__dots" aria-hidden>
                            {[0, 1, 2].map((d) => (
                              <motion.span
                                key={d}
                                animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: d * 0.14 }}
                              />
                            ))}
                          </span>
                        </span>
                      )}
                      {status === "sent" && (
                        <span className="cf__sent">
                          <svg className="cf__check" viewBox="0 0 24 24" aria-hidden>
                            <motion.path
                              d="m5 12.5 4.5 4.5L19 7.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
                            />
                          </svg>
                          Thank You
                        </span>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <p id="cf-status" className="cf__sr" role="status" aria-live="polite">
                  {status === "sending" ? "Sending your message…" : status === "sent" ? "Message sent. Thank you!" : ""}
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}
