"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import { Inter_Tight } from "next/font/google";
import "./synais-footer.css";

/**
 * Synais Footer — a near-black finance footer with a giant cream wordmark.
 *
 * The brand, a line on what it does and its socials on the left; a newsletter
 * field on the right; four columns of links, a fine-print row, and "synais."
 * set huge and bleeding off the bottom edge. The columns fade in on a stagger
 * and the wordmark rises a letter at a time. The newsletter is a real field:
 * it checks the address, shows that it is sending and says thanks — wire
 * `onSubscribe` to your own list. Four columns on desktop, two on a tablet,
 * and the newsletter drops under the brand on a phone.
 */

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--sy-font", display: "swap" });

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WORDMARK = "synais.";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: ["Platform", "About", "Features", "Pricing", "Careers", "Help"].map((label) => ({ label, href: "#" })),
  },
  {
    title: "Solutions",
    links: [
      "Financial Planning",
      "Budget Management",
      "Cash Flow Forecasting",
      "Financial Reporting",
      "Variance Analysis",
      "Executive Dashboards",
    ].map((label) => ({ label, href: "#" })),
  },
  {
    title: "Resources",
    links: ["Blog", "AI for Finance Guide", "Case Studies", "Knowledge Base", "API Documentation", "Product Updates"].map(
      (label) => ({ label, href: "#" }),
    ),
  },
  {
    title: "Contact",
    links: [
      { label: "hello@synais.ai", href: "mailto:hello@synais.ai" },
      { label: "+62 21 5555 8888", href: "tel:+622155558888" },
      { label: "Surabaya, Indonesia", href: "#" },
    ],
  },
];

const SOCIALS: { label: string; path: string }[] = [
  {
    label: "GitHub",
    path: "M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0 1 12 6.9c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.1 10.1 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z",
  },
  {
    label: "X",
    path: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.1 14.45Z",
  },
  {
    label: "LinkedIn",
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
  {
    label: "YouTube",
    path: "M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.34-1.91.5-3.85.5-5.8s-.16-3.89-.5-5.8ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z",
  },
];

const fade: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_OUT, delay },
  }),
};

/* the brand's mark: a rounded square with an "s" cut from two arcs */
function Mark() {
  return (
    <svg className="sy__mark" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M15.6 8.6c-.7-1-1.9-1.6-3.4-1.6-2 0-3.4 1-3.4 2.5 0 3.2 7.2 1.7 7.2 5 0 1.6-1.6 2.6-3.7 2.6-1.6 0-2.9-.6-3.7-1.8"
        fill="none"
        stroke="#0b0b0b"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Status = "idle" | "sending" | "done";

export default function SynaisFooter({
  onSubscribe,
}: {
  /** Add the address to your list. Left out, the demo waits a moment and says thanks. */
  onSubscribe?: (email: string) => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function subscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    if (!EMAIL.test(email.trim())) {
      setError("Enter a valid email");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await (onSubscribe ? onSubscribe(email.trim()) : new Promise((r) => setTimeout(r, 900)));
      setStatus("done");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3200);
    } catch {
      setStatus("idle");
      setError("Something went wrong, try again");
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`sy-page ${interTight.variable}`}>
        <footer className="sy" aria-label="Synais">
          <div className="sy__top">
            <motion.div className="sy__brand" variants={fade} initial="hidden" animate="show" custom={0.1}>
              <a href="#top" className="sy__logo" aria-label="Synais home" onClick={(e) => e.preventDefault()}>
                <Mark />
                <span>synais.</span>
              </a>
              <p className="sy__about">
                Empower finance teams with AI-driven insights, automated reporting, and smarter decision-making.
              </p>
              <ul className="sy__socials">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a href="#" aria-label={s.label} onClick={(e) => e.preventDefault()}>
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path d={s.path} fill="currentColor" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div className="sy__news" variants={fade} initial="hidden" animate="show" custom={0.2}>
              <h2 className="sy__heading" id="sy-news">
                Stay Ahead in Finance
              </h2>
              <form className={`sy__field${error ? " is-invalid" : ""}`} onSubmit={subscribe} noValidate aria-labelledby="sy-news">
                <input
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  aria-label="Email address"
                  aria-invalid={Boolean(error)}
                  aria-describedby="sy-news-note"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                />
                <button type="submit" aria-label="Subscribe" disabled={status === "sending"} aria-busy={status === "sending"}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.svg
                      key={status}
                      viewBox="0 0 24 24"
                      aria-hidden
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1, rotate: status === "sending" ? 360 : 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={
                        status === "sending"
                          ? { rotate: { duration: 0.9, repeat: Infinity, ease: "linear" }, default: { duration: 0.2 } }
                          : { duration: 0.25 }
                      }
                    >
                      {status === "done" ? (
                        <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : status === "sending" ? (
                        <path d="M12 4a8 8 0 1 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      ) : (
                        <path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </motion.svg>
                  </AnimatePresence>
                </button>
              </form>
              <p id="sy-news-note" className={`sy__note${error ? " is-error" : ""}`} role="status" aria-live="polite">
                {error ||
                  (status === "done"
                    ? "You're in. Look out for the first issue."
                    : "Get the latest finance insights, AI trends, and product updates delivered to your inbox.")}
              </p>
            </motion.div>
          </div>

          <nav className="sy__cols" aria-label="Footer">
            {COLUMNS.map((col, ci) => (
              <div key={col.title} className="sy__col">
                <motion.h2 className="sy__heading" variants={fade} initial="hidden" animate="show" custom={0.3 + ci * 0.07}>
                  {col.title}
                </motion.h2>
                <ul className="sy__list">
                  {col.links.map((l, li) => (
                    <motion.li
                      key={l.label}
                      variants={fade}
                      initial="hidden"
                      animate="show"
                      custom={0.36 + ci * 0.07 + li * 0.035}
                    >
                      <a
                        className="sy__link"
                        href={l.href}
                        onClick={l.href === "#" ? (e) => e.preventDefault() : undefined}
                      >
                        {l.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <motion.div className="sy__fine" variants={fade} initial="hidden" animate="show" custom={0.75}>
            <p>© 2026 Synais. All rights reserved.</p>
            <ul>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Privacy Policy
                </a>
              </li>
            </ul>
          </motion.div>

          {/* the giant wordmark, rising a letter at a time and bleeding off the bottom edge */}
          <p className="sy__word" aria-hidden>
            {Array.from(WORDMARK).map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: "40%", opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.55 + i * 0.07 }}
              >
                {ch}
              </motion.span>
            ))}
          </p>
        </footer>
      </main>
    </MotionConfig>
  );
}
