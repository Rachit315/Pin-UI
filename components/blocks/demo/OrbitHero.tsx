"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { startGlobe } from "./orbit-globe";
import "./orbit-hero.css";

/**
 * Orbit Hero — a space hero with a live Earth.
 *
 * A vertical bracket nav, a headline whose one gradient runs across every word
 * while each word blurs in on its own, a glowing Enter Orbit button, and the
 * planet rising from the bottom edge. The Earth is a still picture first and a
 * WebGL globe a moment later — same camera, same light, so the hand-off cannot
 * be seen — and then it turns, slowly, only while it is on screen. Without
 * WebGL the still picture simply stays.
 *
 * It fills the viewport it is given; below 1024px the nav folds into a sheet.
 */

/* Geist ships with the `geist` package and loads from local files, so nothing is fetched from Google at build time */
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--oh-serif", display: "swap" });

/* the pictures, served from /public */
const ART = {
  earth: "/blocx/orbit-hero/earth.webp",
  surface: "/blocx/orbit-hero/surface.webp",
  clouds: "/blocx/orbit-hero/clouds.webp",
  logo: "/blocx/orbit-hero/logo.webp",
};

/** Scroll to an in-page anchor, smoothly. */
function scrollToAnchor(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const NAV = [
  { label: "Experience", href: "#experience" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
  { label: "Enter Orbit", href: "#enter-orbit" },
];

const HEADLINE: { text: string; serif?: boolean; breakAfter?: boolean }[] = [
  { text: "Experience", serif: true },
  { text: "Earth" },
  { text: "Like", breakAfter: true },
  { text: "Never" },
  { text: "Before" },
];

/* ---------- entrance choreography ---------- */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT, delay },
  }),
};

const word: Variants = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(14px)" },
  show: (i: number) => ({
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: EASE_OUT, delay: 0.55 + i * 0.085 },
  }),
};

/**
 * The headline gradient runs across the whole text block (as in the Figma file),
 * but each word animates on its own. To keep one continuous gradient, every word
 * gets the block's width as background-size and its own offset as position.
 */
function useBlockGradient(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.setProperty("--hw", `${el.clientWidth}px`);
      el.querySelectorAll<HTMLElement>("[data-word]").forEach((w) =>
        w.style.setProperty("--x", `${w.offsetLeft}px`),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    document.fonts?.ready.then(update);
    return () => ro.disconnect();
  }, [ref]);
}

/* ---------- pieces ---------- */

function NavList({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (href: string) => void;
}) {
  return (
    <ul className="oh-nav-list">
      {NAV.map((item, i) => {
        const isActive = active === item.href;
        return (
          <motion.li
            key={item.href}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 + i * 0.06 }}
          >
            <a
              href={item.href}
              className={`oh-nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSelect(item.href);
              }}
            >
              {isActive && (
                <motion.span layoutId="br-l" className="oh-br" aria-hidden transition={{ type: "spring", stiffness: 420, damping: 34 }}>
                  [
                </motion.span>
              )}
              <span className="nav-text">{item.label}</span>
              {isActive && (
                <motion.span layoutId="br-r" className="oh-br" aria-hidden transition={{ type: "spring", stiffness: 420, damping: 34 }}>
                  ]
                </motion.span>
              )}
            </a>
          </motion.li>
        );
      })}
    </ul>
  );
}

function MobileMenu({
  open,
  active,
  onSelect,
  onClose,
}: {
  open: boolean;
  active: string;
  onSelect: (href: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          className="oh-menu-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
          transition={{ duration: 0.35 }}
        >
          <nav aria-label="Primary">
            <ul>
              {NAV.map((item, i) => (
                <li key={item.href}>
                  <motion.a
                    href={item.href}
                    className={active === item.href ? "is-active" : undefined}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.08 + i * 0.05 } }}
                    exit={{ opacity: 0, y: -12, transition: { duration: 0.2, delay: (NAV.length - i) * 0.025 } }}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelect(item.href);
                      onClose();
                    }}
                  >
                    {item.label}
                  </motion.a>
                </li>
              ))}
            </ul>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OrbitButton() {
  return (
    <motion.a
      href="#enter-orbit"
      className="oh-orbit-btn"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={1.05}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={(e) => {
        e.preventDefault();
        scrollToAnchor("#enter-orbit");
      }}
    >
      <span className="oh-orbit-btn__glow" aria-hidden />
      <span className="oh-orbit-btn__line oh-orbit-btn__line--top" aria-hidden />
      <span className="oh-orbit-btn__line oh-orbit-btn__line--mid" aria-hidden />
      <span className="oh-orbit-btn__sheen" aria-hidden />
      <span className="oh-orbit-btn__label">Enter Orbit</span>
    </motion.a>
  );
}

function Earth() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  // The static render shows instantly; the WebGL globe takes over once its textures are on the GPU.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: { destroy: () => void } | null = null;
    const ac = new AbortController();
    startGlobe(
      canvas,
      { surface: ART.surface, clouds: ART.clouds, surfaceBottomLat: -30.015, cloudsBottomLat: -30 },
      () => !ac.signal.aborted && setLive(true),
      () => !ac.signal.aborted && setLive(false),
      ac.signal,
    ).then((h) => (ac.signal.aborted ? h.destroy() : (handle = h)));
    return () => {
      ac.abort();
      handle?.destroy();
    };
  }, []);

  return (
    <div className="oh-earth-stage" aria-hidden>
      <motion.div
        className="oh-earth"
        initial={{ opacity: 0, y: "14%", scale: 1.08 }}
        animate={{ opacity: 1, y: "0%", scale: 1 }}
        transition={{ duration: 2.2, ease: EASE_OUT, delay: 0.1 }}
      >
        <motion.div
          className="oh-earth__halo"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.75] }}
          transition={{ duration: 3, delay: 1, times: [0, 0.5, 1] }}
        />
        <img
          src={ART.earth}
          alt=""
          draggable={false}
          className={`oh-earth__img${live ? " is-hidden" : ""}`}
        />
        <canvas ref={canvasRef} className={`oh-earth__globe${live ? " is-live" : ""}`} />
      </motion.div>
    </div>
  );
}

/* ---------- hero ---------- */

export default function Hero() {
  const [active, setActive] = useState("#experience");
  const [menuOpen, setMenuOpen] = useState(false);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useBlockGradient(headlineRef);

  const select = (href: string) => {
    setActive(href);
    scrollToAnchor(href);
  };

  return (
    <section id="experience" className={`oh-hero ${GeistSans.variable} ${serif.variable}`} aria-labelledby="hero-title">
      <header className="oh-hero__header">
        <motion.div
          className="oh-logo"
          initial={{ opacity: 0, scale: 0.6, rotate: -45, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.25 }}
        >
          <img src={ART.logo} alt="" width={50} height={50} draggable={false} />
        </motion.div>

        <nav className="oh-nav-desktop" aria-label="Primary">
          <NavList active={active} onSelect={select} />
        </nav>

        <motion.button
          type="button"
          className={`oh-menu-btn${menuOpen ? " is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 }}
        >
          <span className="menu-btn__label">{menuOpen ? "Close" : "Menu"}</span>
          <span className="oh-menu-btn__icon" aria-hidden>
            <span />
            <span />
          </span>
        </motion.button>
      </header>

      <MobileMenu open={menuOpen} active={active} onSelect={select} onClose={() => setMenuOpen(false)} />

      <div className="oh-hero__content">
        <motion.p className="oh-eyebrow" variants={fadeUp} initial="hidden" animate="show" custom={0.4}>
          No setup. No hardware. Just you and the universe.
        </motion.p>

        <h1 id="hero-title" ref={headlineRef} className="oh-headline">
          {HEADLINE.map((w, i) => (
            <span key={w.text} className="headline__slot">
              <motion.span
                data-word
                className={`oh-headline__word${w.serif ? " oh-headline__word--serif" : ""}`}
                variants={word}
                initial="hidden"
                animate="show"
                custom={i}
              >
                {w.text}
              </motion.span>
              {" "}
              {w.breakAfter && <br className="oh-headline__br" />}
            </span>
          ))}
        </h1>

        <OrbitButton />
      </div>

      <Earth />
    </section>
  );
}
