"use client";

import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import PinMark from "./PinMark";
import { LINKS } from "@/lib/links";
import { usePinTheme } from "@/lib/theme";
import "./mobile-menu.css";

/**
 * The site's menu on a phone.
 *
 * Every header carries the same square button, shown only below the width
 * where its own links stop fitting (`at`). It opens one sheet over the whole
 * screen: the three places on the site, large enough to hit with a thumb, and
 * underneath them the ways out — GitHub, X, the submit form — and the theme.
 *
 * The sheet's close button is drawn exactly where the button that opened it
 * was, so the bars appear to turn into the cross in place rather than the
 * control jumping somewhere else on the screen.
 *
 * While it is open the page underneath cannot scroll, focus cannot leave it,
 * and Escape closes it. A link to a section of the landing page, followed from
 * the landing page, closes the sheet first and then glides there — the page is
 * not allowed to move while it is still locked.
 */

const PLACES = [
  { label: "Home", href: "/#top", match: (p: string) => p === "/" },
  { label: "Components", href: "/#components", match: (p: string) => p.startsWith("/components") },
  { label: "Testimonials", href: "/#testimonials", match: (p: string) => p.startsWith("/testimonials") },
];

const SUBMIT_URL = "https://tally.so/r/2EQY9e";
const EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileMenu({
  at = 700,
  className = "",
}: {
  /** the widest screen it shows on; above this the header's own links are there */
  at?: 700 | 900;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { theme, toggleTheme } = usePinTheme();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /* where the button sits on screen, so the close button can sit on top of it */
  const [spot, setSpot] = useState<{ top: number; right: number; size: number } | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  /* a section to glide to once the sheet has gone */
  const pending = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  const show = useCallback(() => {
    const r = toggleRef.current?.getBoundingClientRect();
    if (r) setSpot({ top: r.top, right: window.innerWidth - r.right, size: r.width });
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  /* a new page closes it */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* it is a phone's menu: if the screen grows past `at`, it is not needed */
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${at + 1}px)`);
    const close = () => query.matches && setOpen(false);
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, [at]);

  /* the page holds still underneath, and Escape and Tab stay with the sheet */
  useEffect(() => {
    if (!open) return;
    /*
     * Only the root is locked. `html` and `body` are both 100% tall here, so
     * hiding the body's overflow as well would clip the page to one screen and
     * the browser would throw the reader back to the top — taking the rail,
     * and the menu inside it, away with the scroll position.
     */
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const items = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    /* the close button takes focus, so Escape and Enter both work at once */
    const t = window.setTimeout(() => sheetRef.current?.querySelector<HTMLElement>(".mmenu__close")?.focus(), 30);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      root.style.overflow = before;
    };
  }, [open]);

  /* once the sheet has gone and the page can move again: go where was asked */
  function afterClose() {
    const target = pending.current;
    pending.current = null;
    if (target) {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", target === "top" ? "/" : `#${target}`);
      }
      return;
    }
    /* back to the button that opened it, for anyone on a keyboard */
    toggleRef.current?.focus({ preventScroll: true });
  }

  function go(e: React.MouseEvent, href: string) {
    const hash = href.split("#")[1];
    /* a section of the page we are on: close first, then glide */
    if (hash && pathname === "/") {
      e.preventDefault();
      pending.current = hash;
      setOpen(false);
      return;
    }
    setOpen(false);
  }

  const inverted = theme === "crimson";

  const sheet = (
    <AnimatePresence onExitComplete={afterClose}>
      {open && (
        <motion.div
          key="sheet"
          ref={sheetRef}
          id={`${id}-menu`}
          className="mmenu__sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
          exit={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          transition={reduced ? { duration: 0.15 } : { duration: 0.55, ease: EASE }}
        >
          <div className="mmenu__top" style={spot ? { height: spot.size + spot.top * 2 } : undefined}>
            <Link className="mmenu__brand" href="/" onClick={(e) => go(e, "/#top")}>
              <PinMark className="mmenu__mark" />
              <span>Pin UI</span>
            </Link>
          </div>

          <button
            type="button"
            className="mmenu__close"
            onClick={hide}
            aria-label="Close menu"
            style={spot ? { top: spot.top, right: spot.right, width: spot.size, height: spot.size } : undefined}
          >
            <Bars open />
          </button>

          <nav className="mmenu__nav" aria-label="Site">
            <ol className="mmenu__places">
              {PLACES.map((place, i) => {
                const here = place.match(pathname);
                return (
                  <motion.li
                    key={place.href}
                    initial={reduced ? false : { opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -10, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : 0.16 + i * 0.06 }}
                  >
                    <Link
                      className="mmenu__place"
                      href={place.href}
                      aria-current={here ? "page" : undefined}
                      onClick={(e) => go(e, place.href)}
                    >
                      <span className="mmenu__index">{String(i + 1).padStart(2, "0")}</span>
                      <span className="mmenu__label">{place.label}</span>
                      <svg className="mmenu__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M7 17 17 7m0 0H8.5M17 7v8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </motion.li>
                );
              })}
            </ol>
          </nav>

          <motion.div
            className="mmenu__foot"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : 0.36 }}
          >
            <a className="mmenu__submit" href={SUBMIT_URL} target="_blank" rel="noopener noreferrer">
              Submit a design
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 17 17 7m0 0H8.5M17 7v8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <div className="mmenu__row">
              <div className="mmenu__socials">
                <a className="mmenu__social" href={LINKS.github} target="_blank" rel="noopener noreferrer" aria-label="Pin UI on GitHub">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                    />
                  </svg>
                </a>
                <a className="mmenu__social" href={LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="Pin UI on X">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    />
                  </svg>
                </a>
                <a className="mmenu__social" href={`mailto:${LINKS.email}`} aria-label={`Email Pin UI at ${LINKS.email}`}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="5.5" width="18" height="13" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>

              {/* the theme, said in words here — the mark is the switch everywhere else */}
              <button
                type="button"
                className="mmenu__theme"
                onClick={toggleTheme}
                aria-label={`Switch to the ${inverted ? "light" : "crimson"} theme`}
              >
                <span className="mmenu__themeTrack" data-on={inverted}>
                  <span className="mmenu__themeKnob" />
                </span>
                {inverted ? "Crimson" : "Light"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        className={`mmenu__toggle ${className}`}
        data-at={at}
        onClick={show}
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label="Open menu"
      >
        <Bars open={false} />
      </button>
      {mounted && createPortal(sheet, document.body)}
    </>
  );
}

/* two bars that cross into an x — square ends, like everything else here */
function Bars({ open }: { open: boolean }) {
  return (
    <span className="mmenu__bars" data-open={open} aria-hidden="true">
      <i />
      <i />
    </span>
  );
}
