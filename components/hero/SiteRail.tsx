"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import MobileMenu from "../MobileMenu";
import { LINKS } from "@/lib/links";
import { softSpring } from "@/lib/motion";
import { useRailed } from "./useRailed";
import { useCompactRail } from "./useCompactRail";
import { useFooterInView } from "./useFooterInView";

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
  /* the footer has its own lockup and links; the rail steps aside for it */
  const footerUp = useFooterInView();
  const pathname = usePathname();

  /*
   * The rail follows you onto the component pages, where `#components` is not
   * on the page at all. On the landing page the links stay bare hashes so the
   * browser scrolls smoothly; anywhere else they become real routes.
   */
  const onLanding = pathname === "/";

  return (
    <AnimatePresence>
      {railed && !footerUp && (
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
                <a className="rail__link" href="#testimonials">
                  Testimonials
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
                <Link className="rail__link" href="/#testimonials">
                  Testimonials
                </Link>
              </>
            )}
          </div>

          <span className="rail__rule" aria-hidden="true" />

          {/* on a phone the pill is the mark and the menu */}
          <MobileMenu className="rail__menu" />

          <a
            className="rail__github"
            href={LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pin UI on GitHub"
          >
            {/* drawn in the pill's own ink, so it follows both themes with no second file */}
            <svg viewBox="0 0 24 24" className="rail__githubMark" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
              />
            </svg>
          </a>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
