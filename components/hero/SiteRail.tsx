"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import { LINKS } from "@/lib/links";
import { softSpring } from "@/lib/motion";
import { usePinTheme } from "@/lib/theme";
import { useRailed } from "./useRailed";
import { useCompactRail } from "./useCompactRail";

/**
 * The masthead's second life.
 *
 * Once the hero has gone the top bar hands its contents to a pill against the
 * right edge, which then follows you down the page. The mark carries a shared
 * `layoutId` with the one in the masthead, so Motion tweens it between the two
 * positions rather than fading one out and the other in — the lockup travels,
 * and the rest of the bar dissolves around it.
 *
 * The switch comes along for the ride: the mark is the theme toggle here too,
 * so the gesture is the same wherever it is on the page.
 */
export default function SiteRail() {
  const reduced = useReducedMotion();
  const { railed, instant } = useRailed();
  const compact = useCompactRail();
  /* the mark owns the switch itself; this is only for the two GitHub faces */
  const { theme } = usePinTheme();
  const pathname = usePathname();

  const inverted = theme === "crimson";
  /*
   * The rail follows you onto the component pages, where `#components` is not
   * on the page at all. On the landing page the links stay bare hashes so the
   * browser scrolls smoothly; anywhere else they become real routes.
   */
  const onLanding = pathname === "/";

  return (
    <AnimatePresence>
      {railed && (
        <motion.nav
          className="rail"
          aria-label="Site"
          /*
             `y` stays in the transform rather than a CSS `translateY(-50%)`,
             or the centring and the entrance would overwrite each other. No
             scale here either: the mark inside carries a shared `layoutId`, and
             a scaling parent distorts Motion's projection of it.
          */
          /*
             Two entrances, because there are two rails. The wide one slides in
             from the right edge it is pinned to and carries `y: -50%` for its
             own centring; the narrow one descends from the top edge and must
             carry no transform of its own, or it would cancel the centring
             the stylesheet does with margins.
          */
          initial={
            compact
              ? { opacity: 0, y: reduced || instant ? 0 : -18 }
              : reduced || instant
                ? { opacity: 0, y: "-50%" }
                : { opacity: 0, x: 26, y: "-50%" }
          }
          animate={compact ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: 0, y: "-50%" }}
          exit={
            compact
              ? { opacity: 0, y: reduced ? 0 : -14 }
              : reduced
                ? { opacity: 0, y: "-50%" }
                : { opacity: 0, x: 26, y: "-50%" }
          }
          /* arriving because the page was restored scrolled: just be there */
          transition={instant ? { duration: 0 } : softSpring}
        >
          <ThemeMark
            buttonClassName="rail__mark"
            markClassName="rail__markArt"
            layoutId="pin-lockup-mark"
            hover={1.1}
            tap={0.9}
          />

          <span className="rail__rule" aria-hidden="true" />

          <div className="rail__links">
            {onLanding ? (
              <>
                <a className="rail__link" href="#top">
                  Home
                </a>
                <a className="rail__link" href="#components">
                  Components
                </a>
              </>
            ) : (
              <>
                <Link className="rail__link" href="/">
                  Home
                </Link>
                <Link className="rail__link" href="/#components">
                  Components
                </Link>
              </>
            )}
          </div>

          <span className="rail__rule" aria-hidden="true" />

          <a
            className="rail__github"
            href={LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pin UI on GitHub"
          >
            <img
              src="/hero/github.svg"
              alt=""
              width={40}
              height={40}
              className="rail__githubMark"
              style={{ opacity: inverted ? 0 : 1 }}
            />
            <img
              src="/hero/github-crimson.svg"
              alt=""
              width={40}
              height={40}
              className="rail__githubMark rail__githubMark--alt"
              style={{ opacity: inverted ? 1 : 0 }}
            />
          </a>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
