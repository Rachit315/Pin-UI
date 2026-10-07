"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import HeroWall from "./HeroWall";
import PinterestPeek from "./PinterestPeek";
import GitHubStars from "./GitHubStars";
import ThemeMark from "../ThemeMark";
import MobileMenu from "../MobileMenu";
import ThemeHint from "../ThemeHint";
import { softSpring, spring } from "@/lib/motion";
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

  /** Everything in the hero enters on the same curve, just at its own time. */
  const rise = (delay: number) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { ...softSpring, delay },
        } as const);

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
              <motion.div className="hero__brand" {...rise(0.05)}>
                {/* the mark is the switch; the wordmark beside it is plain type */}
                <ThemeMark
                  buttonClassName="hero__markButton"
                  markClassName="hero__mark"
                  layoutId="pin-lockup-mark"
                />

                <span className="hero__wordmark">Pin UI</span>
                {/* under, not over: the frame's edge sits right above the lockup and would cut an arc */}
                <ThemeHint mark=".hero__markButton" word=".hero__wordmark" under />
              </motion.div>

              <motion.nav className="hero__nav" {...rise(0.12)}>
                <a className="hero__navLink" href="#top">
                  Home
                </a>
                <a className="hero__navLink" href="#components">
                  Components
                </a>
                <a className="hero__navLink" href="#testimonials">
                  Testimonials
                </a>
              </motion.nav>

              {/* the octocat lifts away on hover and the star count rises into its place */}
              <GitHubStars {...rise(0.18)} />

              {/* on a phone the links and the square fold into the menu */}
              <motion.div className="hero__menu" {...rise(0.18)}>
                <MobileMenu />
              </motion.div>
            </motion.header>
          )}
        </AnimatePresence>

        <div className="hero__center">
          <motion.a
            className="hero__submit"
            href={SUBMIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            {...rise(0.2)}
          >
            Want to submit a design?? <span aria-hidden="true">→</span>
          </motion.a>

          {/*
            The claim rises out of a clipping mask a line at a time, so the
            sentence arrives the way it reads rather than fading in whole.
          */}
          <h1 className="hero__claim">
            <span className="hero__line">
              <motion.span
                className="hero__lineInner"
                initial={reduced ? false : { y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ ...softSpring, delay: 0.26 }}
              >
                We turn{" "}
                <PinterestPeek />{" "}
                static designs
              </motion.span>
            </span>
            <span className="hero__line">
              <motion.span
                className="hero__lineInner"
                initial={reduced ? false : { y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ ...softSpring, delay: 0.34 }}
              >
                into reusable components
              </motion.span>
            </span>
          </h1>

          {/* the stamp goes to the shelf on this page, gliding there */}
          <motion.a
            className="hero__stamp"
            href="#components"
            initial={reduced ? false : { opacity: 0, scale: 0.88, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.46 }}
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
