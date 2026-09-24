"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import HeroMarquee from "./HeroMarquee";
import PinterestPeek from "./PinterestPeek";
import GitHubStars from "./GitHubStars";
import ThemeMark from "../ThemeMark";
import { softSpring, spring } from "@/lib/motion";
import { useRailed } from "./useRailed";

/**
 * The landing hero, Figma 299:19.
 *
 * The frame is one red rule inset from the viewport, with three bands inside
 * it: the masthead at the top, the component band running across the middle,
 * and the claim with its stamp at the foot. The design is drawn at 1280; the
 * whole thing is sized in `em` off a single clamped root, so it scales as one
 * object instead of needing a breakpoint per element.
 *
 * Clicking the pin — only the pin, never the wordmark beside it — inverts the
 * page, the same gesture the waitlist uses. It runs through the shared
 * `usePinTheme` store rather than a local state, so the choice persists across
 * reloads and follows you between the two pages, and the no-flash script in the
 * layout has already written it before first paint.
 *
 * Two things are deliberately not the Figma file. The Pinterest mark is set
 * inline in the sentence rather than absolutely positioned over a gap in it, so
 * the line stays together at any width; and the foot is a real two-column row
 * rather than two floating blocks, so the stamp cannot collide with the claim
 * when the type reflows.
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
              </motion.div>

              <motion.nav className="hero__nav" {...rise(0.12)}>
                <a className="hero__navLink" href="#top">
                  Home
                </a>
                <a className="hero__navLink" href="#components">
                  Components
                </a>
              </motion.nav>

              {/* the octocat lifts away on hover and the star count rises into its place */}
              <GitHubStars {...rise(0.18)} />
            </motion.header>
          )}
        </AnimatePresence>

        <div className="hero__band">
          <HeroMarquee />
        </div>

        <div className="hero__foot">
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

          {/*
            The stamp points at the shelf on this page, not back at this page.
            It used to read `/demo`, the page it is now the front of — so clicking
            it navigated to the current URL and the whole thing reloaded. A
            fragment travels there instead, smoothly, with nothing refetched.
          */}
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
