"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import PinMark from "../PinMark";
import { softSpring } from "@/lib/motion";
import { LINKS } from "@/lib/links";
import "./footer.css";

/**
 * The foot of every page — Figma 502:1939.
 *
 * A red field with the neon enter key filling it: the lockup and the links
 * across the top, the small print along the bottom. Red in both themes, the
 * way the brand signs off.
 *
 * It moves with the scroll. As the footer comes up the screen the key rises
 * into place from below and settles from a slight zoom, tied to the scroll
 * position itself rather than played on a timer, so it tracks the wheel (and
 * Lenis's easing of it) exactly; the lockup, the links and the small print
 * rise in on a short stagger as they arrive. Reduced motion leaves it still.
 */
export default function SiteFooter() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["22%", "0%"]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.6 },
          transition: { ...softSpring, delay },
        } as const);

  return (
    <footer className="pfoot" ref={ref}>
      {/* the window the key is seen through: everything above the small print */}
      <div className="pfoot__art" aria-hidden="true">
        <motion.div className="pfoot__artInner" style={reduced ? undefined : { y: artY, scale: artScale }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pfoot__img"
          src="/landing/enter-key-2400.webp"
          srcSet="/landing/enter-key-1200.webp 1200w, /landing/enter-key-2400.webp 2400w"
          sizes="100vw"
          alt=""
          width={2400}
          height={1350}
          loading="lazy"
          decoding="async"
        />
        </motion.div>
      </div>

      <div className="pfoot__top">
        <motion.div {...rise(0)}>
          <Link className="pfoot__brand" href="/#top" aria-label="Pin UI — home">
            <PinMark className="pfoot__mark" />
            <span className="pfoot__word" aria-hidden="true">
              Pin UI
            </span>
          </Link>
        </motion.div>

        <motion.div className="pfoot__right" {...rise(0.08)}>
          <nav className="pfoot__nav" aria-label="Footer">
            <Link className="pfoot__navLink" href="/#top">
              Home
            </Link>
            <Link className="pfoot__navLink" href="/#components">
              Components
            </Link>
            <Link className="pfoot__navLink" href="/#testimonials">
              Testimonials
            </Link>
          </nav>

          <span className="pfoot__rule" aria-hidden="true" />

          <div className="pfoot__socials">
            <a
              className="pfoot__social"
              href={LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message Pin UI on X"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3.5 3.5h4.2l5 6.7 5.6-6.7h2.2l-6.8 8.1 7.2 9.6h-4.2l-5.4-7.2-6 7.2H3.1l7.3-8.7L3.5 3.5Z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <a
              className="pfoot__social"
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pin UI on GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
                />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div className="pfoot__bar" {...rise(0.16)}>
        <p className="pfoot__small">
          <span>Pin UI © 2026</span>
          <a className="pfoot__link" href={`mailto:${LINKS.email}`}>
            Support: {LINKS.email}
          </a>
        </p>
        <p className="pfoot__small">
          <Link className="pfoot__link" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="pfoot__link" href="/terms">
            Terms of Service
          </Link>
          <a className="pfoot__link" href="/sitemap.xml">
            Sitemap
          </a>
          <a className="pfoot__link" href="/robots.txt">
            robots.txt
          </a>
        </p>
      </motion.div>
    </footer>
  );
}
