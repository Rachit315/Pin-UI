"use client";

import BlocksLink from "../BlocksLink";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import HeroWall from "./HeroWall";
import PinterestPeek from "./PinterestPeek";
import GitHubStars from "./GitHubStars";
import ThemeMark from "../ThemeMark";
import MobileMenu from "../MobileMenu";
import ThemeHint from "../ThemeHint";
import { softSpring } from "@/lib/motion";
import { useRailed } from "./useRailed";

/** Where the "submit a design" line goes: the request form. */
const SUBMIT_URL = "https://tally.so/r/2EQY9e";

/**
 * The landing hero — Figma 501:915 (light) and 502:118 (dark).
 *
 * One rounded frame inset from the viewport. Behind everything, a wall of the
 * library's own recordings fades up row by row; over it, the masthead along
 * the top and, centred, the line asking for designs, the claim and the stamp.
 * A soft blur runs along the frame's foot so the wall dissolves into it.
 *
 * Sized in `em` off the one clamped root on `.site`, so the whole hero scales
 * as one object. Clicking the pin — only the pin — flips the page between its
 * light and dark faces through the shared `usePinTheme` store, so the choice
 * persists and follows you around the site; the scribbled note beside the logo
 * says so.
 */
export default function HeroSection() {
  const reduced = useReducedMotion();
  const { railed, instant } = useRailed();

  /*
   * Everything in the hero enters on the same curve, just at its own time —
   * as CSS keyframes (app/hero.css), not Motion, so the first screen is
   * painted and moving before any JavaScript has run: a phone sees the hero
   * at first paint instead of after hydration.
   */
  const rise = (delay: number) => ({ "--rise-d": `${delay}s` }) as React.CSSProperties;

  return (
    <main className="hero" id="top">
      <div className="hero__frame">
        <HeroWall />
        {/*
          The wall softens into the frame's foot rather than stopping at it: a
          progressive blur, six layers each starting lower and blurring twice
          as hard, so there is no line where it begins.
        */}
        <div className="hero__haze" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {/*
          The masthead stands down once the rail takes over, and the mark is
          handed across by a shared `layoutId` rather than fading out here and
          fading in there — so the lockup travels to the rail while the rest of
          the bar dissolves around it.
        */}
        <AnimatePresence>
          {!railed && (
            <motion.header
              className="hero__masthead"
              key="masthead"
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
              /* a page restored part-way down corrects itself without a show */
              transition={instant ? { duration: 0 } : softSpring}
            >
              <div className="hero__brand pin-rise" style={rise(0.05)}>
                {/* the mark is the switch; the wordmark beside it is plain type */}
                <ThemeMark
                  buttonClassName="hero__markButton"
                  markClassName="hero__mark"
                  layoutId="pin-lockup-mark"
                />

                <span className="hero__wordmark">Pin UI</span>
                {/* under, not over: the frame's edge sits right above the lockup and would cut an arc */}
                <ThemeHint mark=".hero__markButton" word=".hero__wordmark" under />
              </div>

              <nav className="hero__nav pin-rise" style={rise(0.12)}>
                <a className="hero__navLink" href="#top">
                  Home
                </a>
                <a className="hero__navLink" href="#components">
                  Components
                </a>
                <BlocksLink className="hero__navLink" />
                <a className="hero__navLink" href="#testimonials">
                  Testimonials
                </a>
              </nav>

              {/* the octocat lifts away on hover and the star count rises into its place */}
              <GitHubStars className="pin-rise" style={rise(0.18)} />

              {/* on a phone the links and the square fold into the menu */}
              <div className="hero__menu pin-rise" style={rise(0.18)}>
                <MobileMenu />
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <div className="hero__center">
          <a className="hero__submit pin-rise" href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" style={rise(0.2)}>
            Want to submit a design?? <span aria-hidden="true">→</span>
          </a>

          {/*
            The claim rises out of a clipping mask a line at a time, so the
            sentence arrives the way it reads rather than fading in whole.
          */}
          <h1 className="hero__claim">
            <span className="hero__line">
              <span className="hero__lineInner hero-line-in" style={rise(0.26)}>
                We turn{" "}
                <PinterestPeek />{" "}
                static designs
              </span>
            </span>
            <span className="hero__line">
              <span className="hero__lineInner hero-line-in" style={rise(0.34)}>
                into reusable components
              </span>
            </span>
          </h1>

          {/* the stamp goes to the shelf on this page, gliding there */}
          <motion.a
            className="hero__stamp hero-stamp-in"
            href="#components"
            whileHover={reduced ? undefined : { scale: 1.04, rotate: -1.5 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
          >
            <span className="hero__stampShape" aria-hidden="true" />
            <span className="hero__stampLabel">Browse Components</span>
          </motion.a>
        </div>
      </div>
    </main>
  );
}
