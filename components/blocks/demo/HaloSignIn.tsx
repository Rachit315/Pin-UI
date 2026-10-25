"use client";

import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SVGProps } from "react";
import { AnimatePresence, motion, MotionConfig, type Transition, type Variants } from "motion/react";
import { Inter } from "next/font/google";
import "./halo-sign-in.css";

/**
 * Halo Sign In — a soft, two-layer sign-in card for a rental app.
 *
 * A white card sits in a pale tray: an app mark in a slowly turning field of
 * dots, a title, email and password fields with a show / hide toggle, a black
 * Sign In button, and Google, Facebook and Apple underneath a dashed rule; the
 * tray's lip holds the sign-up link.
 *
 * On arrival the tray rises, the dot field unwinds into place, the mark
 * springs in and draws its house outline, and each row rises and un-blurs on a
 * stagger. The fields brighten on focus. The button rolls its label to
 * "Signing in…" with a spinner and then "Welcome back". Wire `onSubmit` to
 * your own auth; the demo waits a moment.
 */

const inter = Inter({ subsets: ["latin"], variable: "--hsi-font", display: "swap" });

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

export type HaloSignInValues = { email: string; password: string };

type Status = "idle" | "loading" | "done";

export default function HaloSignIn({
  onSubmit,
  onProvider,
}: {
  /** Sign the visitor in. Left out, the demo waits a moment and says welcome back. */
  onSubmit?: (values: HaloSignInValues) => Promise<void> | void;
  /** Called when one of the social buttons is pressed. */
  onProvider?: (provider: "google" | "facebook" | "apple") => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "idle") return;
    const data = new FormData(e.currentTarget);
    setStatus("loading");
    try {
      await (onSubmit
        ? onSubmit({ email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") })
        : new Promise((r) => setTimeout(r, 1100)));
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`hsi ${inter.variable}`}>
        <motion.section
          aria-labelledby="hsi-title"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          className="hsi__tray"
        >
          <motion.div variants={stagger(0.25, 0.055)} initial="hidden" animate="show" className="hsi__card">
            <Halo />

            <motion.header variants={item} className="hsi__head">
              <h1 id="hsi-title" className="hsi__title">
                Sign in to continue
              </h1>
              <p className="hsi__lede">Please sign in to start your rental application</p>
            </motion.header>

            <form onSubmit={handleSubmit} className="hsi__form">
              <motion.div variants={item}>
                <Field type="email" name="email" label="Email" autoComplete="email" icon={<MailIcon />} />
              </motion.div>

              <motion.div variants={item}>
                <Field
                  type={showPassword ? "text" : "password"}
                  name="password"
                  label="Password"
                  autoComplete="current-password"
                  minLength={6}
                  icon={<LockIcon />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="hsi__peek"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={showPassword ? "off" : "on"}
                          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                          transition={{ duration: 0.2 }}
                          className="hsi__peek-icon"
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  }
                />
              </motion.div>

              <motion.div variants={item} className="hsi__submit-row">
                <motion.button
                  type="submit"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985, y: 0 }}
                  transition={SPRING}
                  disabled={status !== "idle"}
                  aria-live="polite"
                  className="hsi__submit"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={status}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="hsi__submit-label"
                    >
                      {status === "idle" && "Sign In"}
                      {status === "loading" && (
                        <>
                          <Spinner /> Signing in…
                        </>
                      )}
                      {status === "done" && "Welcome back"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={item} className="hsi__or">
              <span className="hsi__rule" aria-hidden />
              <span>Or continue with</span>
              <span className="hsi__rule" aria-hidden />
            </motion.div>

            <motion.div variants={item} className="hsi__socials">
              <SocialButton label="Continue with Google" onClick={() => onProvider?.("google")}>
                <GoogleIcon />
              </SocialButton>
              <SocialButton label="Continue with Facebook" onClick={() => onProvider?.("facebook")}>
                <FacebookIcon />
              </SocialButton>
              <SocialButton label="Continue with Apple" onClick={() => onProvider?.("apple")}>
                <AppleIcon />
              </SocialButton>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="hsi__foot"
          >
            Don&apos;t have an account?{" "}
            <a href="#signup" className="hsi__link">
              Sign Up
            </a>
          </motion.p>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

/* the app mark in a slowly turning field of dots that fades at the edges */
function Halo() {
  const rings = [
    { r: 34, n: 18 },
    { r: 44, n: 24 },
    { r: 54, n: 30 },
  ];
  return (
    <div className="hsi__halo">
      <motion.svg
        viewBox="-60 -60 120 120"
        className="hsi__dots"
        initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.15 }}
        aria-hidden
      >
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 90, ease: "linear", repeat: Infinity }}>
          {rings.flatMap(({ r, n }, ri) =>
            Array.from({ length: n }, (_, i) => {
              const a = (i / n) * Math.PI * 2 + ri * 0.35;
              /* rounded, so the server's trig and the browser's agree to the last digit and hydration matches */
              const cx = Math.round(Math.cos(a) * r * 1000) / 1000;
              const cy = Math.round(Math.sin(a) * r * 1000) / 1000;
              return <circle key={`${ri}-${i}`} cx={cx} cy={cy} r={0.9} fill="currentColor" />;
            }),
          )}
        </motion.g>
      </motion.svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.3 }}
        whileHover={{ scale: 1.06, rotate: 4 }}
        className="hsi__mark"
      >
        {/* a home outline with a keyhole door, for a rental app */}
        <svg viewBox="0 0 24 24" aria-hidden>
          <motion.path
            d="M4.5 10.4 12 4.5l7.5 5.9V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18v-7.6Z"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.55 }}
          />
          <motion.g
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.95 }}
            style={{ transformOrigin: "12px 14px" }}
          >
            <circle cx="12" cy="12.8" r="1.7" fill="#fff" />
            <path d="M11.2 13.6h1.6l.4 3h-2.4l.4-3Z" fill="#fff" />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}

type FieldProps = {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder">;

function Field({ label, icon, trailing, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="hsi__field">
      <label htmlFor={id} className="hsi__sr">
        {label}
      </label>
      <span className="hsi__field-icon">{icon}</span>
      <input id={id} required placeholder={label} className="hsi__input" {...input} />
      {trailing && <span className="hsi__trailing">{trailing}</span>}
    </div>
  );
}

function SocialButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={SPRING}
      className="hsi__social"
    >
      {children}
    </motion.button>
  );
}

/* ---------------------------------------------------------------- icons */

type P = SVGProps<SVGSVGElement>;

const MailIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M3.5 5.5h17a1.5 1.5 0 0 1 1.5 1.5v.36l-10 5.7-10-5.7V7a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M2 9.08V17a1.5 1.5 0 0 0 1.5 1.5h17A1.5 1.5 0 0 0 22 17V9.08l-9.5 5.42a1 1 0 0 1-1 0L2 9.08Z" />
  </svg>
);

const LockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path
      fillRule="evenodd"
      d="M7 9V7.5a5 5 0 0 1 10 0V9h.5A2.5 2.5 0 0 1 20 11.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-8A2.5 2.5 0 0 1 6.5 9H7Zm2 0h6V7.5a3 3 0 1 0-6 0V9Zm3 4a1.5 1.5 0 0 0-1 2.62V17a1 1 0 1 0 2 0v-1.38A1.5 1.5 0 0 0 12 13Z"
    />
  </svg>
);

const EyeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path
      fillRule="evenodd"
      d="M12 5c4.6 0 8.3 3.1 9.8 6.4a1.4 1.4 0 0 1 0 1.2C20.3 15.9 16.6 19 12 19s-8.3-3.1-9.8-6.4a1.4 1.4 0 0 1 0-1.2C3.7 8.1 7.4 5 12 5Zm0 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
    />
  </svg>
);

const EyeOffIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M3.3 2.3a1 1 0 0 0-1.4 1.4l2.4 2.4A11.6 11.6 0 0 0 2.2 11.4a1.4 1.4 0 0 0 0 1.2C3.7 15.9 7.4 19 12 19c1.7 0 3.3-.4 4.7-1.2l3 3a1 1 0 0 0 1.4-1.4l-17.8-17.1ZM12 8.5c.2 0 .5 0 .7.1L8.6 4.5A10.9 10.9 0 0 1 12 5c4.6 0 8.3 3.1 9.8 6.4a1.4 1.4 0 0 1 0 1.2 11.7 11.7 0 0 1-2.4 3.4L15.4 12A3.5 3.5 0 0 0 12 8.5Zm-3.4 3.1 3.8 3.8a3.5 3.5 0 0 1-3.8-3.8Z" />
  </svg>
);

const GoogleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
  </svg>
);

const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <circle cx="12" cy="12" r="12" fill="#0866FF" />
    <path
      fill="#fff"
      d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.95-1.88h1.51V4.92s-1.37-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.03V24a12.1 12.1 0 0 0 3.76 0v-8.53h2.8Z"
    />
  </svg>
);

const AppleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91a4.8 4.8 0 0 0-3.77-2.04c-1.6-.16-3.13.94-3.95.94-.81 0-2.07-.92-3.4-.9a5.04 5.04 0 0 0-4.26 2.58c-1.82 3.15-.47 7.82 1.3 10.38.87 1.25 1.9 2.66 3.26 2.6 1.31-.05 1.8-.84 3.38-.84 1.58 0 2.02.84 3.4.82 1.41-.03 2.3-1.27 3.15-2.53a11.3 11.3 0 0 0 1.43-2.93 4.55 4.55 0 0 1-2.76-4.17ZM13.77 5.1A4.5 4.5 0 0 0 14.83 1.8a4.63 4.63 0 0 0-3 1.55 4.3 4.3 0 0 0-1.09 3.18 3.81 3.81 0 0 0 3.03-1.43Z" />
  </svg>
);

const Spinner = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className="hsi__spinner" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
