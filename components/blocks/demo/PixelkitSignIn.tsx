"use client";

import { useId, useState, type FormEvent, type ReactNode, type SVGProps } from "react";
import { AnimatePresence, motion, MotionConfig, type Transition, type Variants } from "motion/react";
import { Inter } from "next/font/google";
import "./pixelkit-sign-in.css";

/**
 * Pixelkit Sign In — a quiet, one-column sign-in with a lime app tile.
 *
 * No card: a lime tile with the Pixelkit mark, a title and a line, Google,
 * GitHub and Apple side by side, an "or" rule, an email field with a black
 * Continue button for a magic link, and the terms underneath.
 *
 * On arrival the tile drops in on a spring and its four pixels pop in one
 * after another, the last one — the rounded "cursor" — with a little
 * overshoot; then each row rises and un-blurs on a stagger. The button rolls
 * its label to "Sending link…" with a spinner and then "Check your inbox".
 * Wire `onSubmit` to send the link; the demo waits a moment.
 */

const inter = Inter({ subsets: ["latin"], variable: "--pksi-font", display: "swap" });

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SPRING: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };

const stagger = (delayChildren: number, staggerChildren: number): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

/* rise and un-blur: the entrance for every row */
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_OUT } },
};

type Status = "idle" | "loading" | "sent";

export default function PixelkitSignIn({
  onSubmit,
  onProvider,
}: {
  /** Send the sign-in link. Left out, the demo waits a moment and says to check the inbox. */
  onSubmit?: (email: string) => Promise<void> | void;
  /** Called when one of the provider buttons is pressed. */
  onProvider?: (provider: "google" | "github" | "apple") => void;
}) {
  const emailId = useId();
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "idle") return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setStatus("loading");
    try {
      await (onSubmit ? onSubmit(email) : new Promise((r) => setTimeout(r, 1100)));
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 1900);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`pksi ${inter.variable}`}>
        <motion.section
          aria-labelledby="pksi-title"
          variants={stagger(0.35, 0.07)}
          initial="hidden"
          animate="show"
          className="pksi__col"
        >
          <Logo />

          <motion.h1 variants={item} id="pksi-title" className="pksi__title">
            Sign into Pixelkit
          </motion.h1>

          <motion.p variants={item} className="pksi__lede">
            New or returning user? Authorize right here.
          </motion.p>

          <motion.div variants={item} className="pksi__providers">
            <ProviderButton icon={<GoogleIcon />} onClick={() => onProvider?.("google")}>
              Google
            </ProviderButton>
            <ProviderButton icon={<GitHubIcon />} onClick={() => onProvider?.("github")}>
              GitHub
            </ProviderButton>
            <ProviderButton icon={<AppleIcon />} onClick={() => onProvider?.("apple")}>
              Apple
            </ProviderButton>
          </motion.div>

          <motion.div variants={item} className="pksi__or" aria-hidden>
            <span className="pksi__rule" />
            <span>or</span>
            <span className="pksi__rule" />
          </motion.div>

          <form onSubmit={handleSubmit} className="pksi__form">
            <motion.div variants={item}>
              <label htmlFor={emailId} className="pksi__sr">
                Email address
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="Enter your email address..."
                className="pksi__input"
              />
            </motion.div>

            <motion.div variants={item}>
              <motion.button
                type="submit"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.985, y: 0 }}
                transition={SPRING}
                disabled={status !== "idle"}
                aria-live="polite"
                className="pksi__submit"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={status}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="pksi__submit-label"
                  >
                    {status === "idle" && "Continue with email"}
                    {status === "loading" && (
                      <>
                        <Spinner /> Sending link…
                      </>
                    )}
                    {status === "sent" && "Check your inbox"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          <motion.p variants={item} className="pksi__terms">
            By continuing, you agree with the <a href="#terms">Terms of Use</a> and the{" "}
            <a href="#privacy">Privacy Policy</a>.
          </motion.p>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

/*
 * The lime app tile with the Pixelkit mark: a 2×2 pixel grid whose fourth
 * cell is a rounded "cursor" dot. The cells pop in once the tile lands.
 */
function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 10, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 15, delay: 0.1 }}
      whileHover={{ scale: 1.05, rotate: -3 }}
      className="pksi__logo"
    >
      <svg viewBox="0 0 32 32" aria-label="Pixelkit" role="img">
        {[
          { x: 4, y: 4, rx: 2.5 },
          { x: 18, y: 4, rx: 2.5 },
          { x: 4, y: 18, rx: 2.5 },
          { x: 18, y: 18, rx: 5 },
        ].map((c, i) => (
          <motion.rect
            key={i}
            x={c.x}
            y={c.y}
            width="10"
            height="10"
            rx={c.rx}
            fill="#111"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: i === 3 ? [0.3, 1.15, 1] : 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.45 + i * 0.08 }}
            style={{ transformOrigin: `${c.x + 5}px ${c.y + 5}px` }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

function ProviderButton({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={SPRING}
      className="pksi__provider"
    >
      <span className="pksi__provider-icon">{icon}</span>
      <span className="pksi__provider-name">{children}</span>
    </motion.button>
  );
}

/* ---------------------------------------------------------------- icons */

type P = SVGProps<SVGSVGElement>;

const GoogleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
  </svg>
);

const GitHubIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

const AppleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91a4.8 4.8 0 0 0-3.77-2.04c-1.6-.16-3.13.94-3.95.94-.81 0-2.07-.92-3.4-.9a5.04 5.04 0 0 0-4.26 2.58c-1.82 3.15-.47 7.82 1.3 10.38.87 1.25 1.9 2.66 3.26 2.6 1.31-.05 1.8-.84 3.38-.84 1.58 0 2.02.84 3.4.82 1.41-.03 2.3-1.27 3.15-2.53a11.3 11.3 0 0 0 1.43-2.93 4.55 4.55 0 0 1-2.76-4.17ZM13.77 5.1A4.5 4.5 0 0 0 14.83 1.8a4.63 4.63 0 0 0-3 1.55 4.3 4.3 0 0 0-1.09 3.18 3.81 3.81 0 0 0 3.03-1.43Z" />
  </svg>
);

const Spinner = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className="pksi__spinner" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
