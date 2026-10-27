"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Inter_Tight } from "next/font/google";
import "./storybook-hero.css";

/**
 * Storybook Hero — "Turn Your Ideas Into Something Magical".
 *
 * A warm parchment hero: a small nav with a pill call to action, a two-line
 * headline, a line under it and two buttons, and an engraved arch at the foot
 * of the screen with a cottage glowing inside it under a crescent moon.
 *
 * On arrival the nav drops in, the headline rises a word at a time out of its
 * own mask, the copy and buttons un-blur after it, and the arch lifts into
 * place and starts to float. The sky behind the moon breathes, the cottage's
 * windows flicker like lamplight, and the stars twinkle on their own clocks.
 * The primary buttons sweep a band of light across on hover; the outlined one
 * fills with brown from the bottom. Below 820px the links fold into a sheet
 * that closes on Escape, a press outside, or the window growing past it.
 *
 * The headline sits over a film of paper grain, and the whole block is sized
 * to one screen: the arch takes whatever height is left under the buttons.
 */

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500"], variable: "--sbh-font", display: "swap" });

const ASSETS = "/blocx/storybook-hero";

const NAV_LINKS = [
  { label: "Home", href: "#", current: true },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About Us", href: "#about" },
];

const HEADLINE = [
  ["Turn", "Your", "Ideas", "Into"],
  ["Something", "Magical"],
];

/* the stars in the arch's sky, as % of the illustration box, measured from the artwork */
const STARS = [
  { x: 49.7, y: 22.6, s: 9, d: 0 },
  { x: 55.9, y: 19.6, s: 5, d: 1.4 },
  { x: 43.1, y: 29.0, s: 5, d: 2.3 },
  { x: 57.6, y: 36.3, s: 5, d: 0.8 },
  { x: 41.7, y: 43.2, s: 5, d: 3.1 },
  { x: 55.9, y: 45.3, s: 7, d: 1.9 },
  { x: 39.9, y: 53.5, s: 6, d: 2.7 },
];

function Arrow() {
  return (
    <svg className="sbh__arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 8h9.5M8.5 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StorybookHero() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /* the phone menu closes on Escape, a press outside it, or the window growing past the breakpoint */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 821px)");
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  let wordIndex = 0;

  return (
    <section className={`sbh ${interTight.variable}`} aria-labelledby="sbh-title">
      <div className="sbh__grain" aria-hidden="true" />

      <header className="sbh__nav">
        <a href="#" className="sbh__logo" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/logo.svg`} alt="" width={31} height={28} />
        </a>

        <div className="sbh__navRight" ref={menuRef}>
          <nav aria-label="Primary">
            <ul className="sbh__links">
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="sbh__link" aria-current={l.current ? "page" : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <a href="#start" className="sbh__btn sbh__btn--primary sbh__navCta">
            <span className="sbh__btnLabel">Start Creating</span>
            <Arrow />
          </a>

          <button
            type="button"
            className="sbh__menuBtn"
            aria-expanded={menuOpen}
            aria-controls="sbh-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
          </button>

          <div id="sbh-menu" className="sbh__sheet" data-open={menuOpen} inert={!menuOpen}>
            <ul>
              {NAV_LINKS.map((l, i) => (
                <li key={l.label} style={{ "--i": i } as CSSProperties}>
                  <a href={l.href} onClick={() => setMenuOpen(false)}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#start" className="sbh__btn sbh__btn--primary sbh__sheetCta" onClick={() => setMenuOpen(false)}>
              <span className="sbh__btnLabel">Start Creating</span>
              <Arrow />
            </a>
          </div>
        </div>
      </header>

      <div className="sbh__content">
        <h1 id="sbh-title" className="sbh__title">
          {HEADLINE.map((line, li) => (
            <span key={li} className="sbh__line">
              {line.map((word, wi) => {
                const i = wordIndex++;
                return (
                  <Fragment key={word}>
                    <span className="sbh__word">
                      <span className="sbh__wordInner" style={{ "--i": i } as CSSProperties}>
                        {word}
                      </span>
                    </span>
                    {wi < line.length - 1 ? " " : null}
                  </Fragment>
                );
              })}
              {li < HEADLINE.length - 1 ? " " : null}
            </span>
          ))}
        </h1>

        <p className="sbh__sub">
          Simplify your workflow, bring your ideas together, and turn them into meaningful results with one
          seamless platform.
        </p>

        <div className="sbh__ctas">
          <a href="#start" className="sbh__btn sbh__btn--primary sbh__btn--lift">
            <span className="sbh__btnLabel">Start Creating</span>
            <Arrow />
          </a>
          <a href="#platform" className="sbh__btn sbh__btn--ghost">
            <span className="sbh__btnLabel">Explore The Platform</span>
          </a>
        </div>
      </div>

      <div className="sbh__stage" aria-hidden="true">
        <div className="sbh__art">
          <div className="sbh__artFloat">
            <div className="sbh__artGlow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="sbh__artImg"
              src={`${ASSETS}/illustration.webp`}
              alt=""
              width={930}
              height={1130}
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
            <div className="sbh__windowGlow" />
            {STARS.map((s, i) => (
              <span
                key={i}
                className="sbh__star"
                style={
                  {
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    "--size": `${s.s}%`,
                    "--delay": `${s.d}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
