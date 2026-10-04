"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import MobileMenu from "../MobileMenu";
import ThemeHint from "../ThemeHint";
import SiteFooter from "./SiteFooter";
import TestimonialCard from "./TestimonialCard";
import { TESTIMONIALS } from "@/lib/testimonials";
import { LINKS } from "@/lib/links";
import { softSpring } from "@/lib/motion";
import "../library/library.css";

/**
 * Every testimonial, on a page of its own — where the landing row's "View all"
 * goes. It wears the library page's bar and intro, so the two read as the same
 * kind of place, and the mark in the bar is the theme switch here as it is
 * everywhere else: the cards trade red for a red-ruled white with the rest.
 */
export default function TestimonialsIndex() {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const rise = (delay = 0) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { ...softSpring, delay },
        } as const);

  return (
    <div className="site lib-page">
      <header className="lib__bar" data-scrolled={scrolled}>
        <div className="lib__brand">
          <ThemeMark buttonClassName="lib__markButton" markClassName="lib__mark" tap={0.88} />
          <Link className="lib__word" href="/">
            Pin UI
          </Link>
          <ThemeHint mark=".lib__markButton" word=".lib__word" />
        </div>
        <nav className="lib__links" aria-label="Site">
          <Link className="lib__link" href="/">
            Home
          </Link>
          <Link className="lib__link" href="/components">
            Components
          </Link>
          <Link className="lib__link" href="/#testimonials">
            Testimonials
          </Link>
          <a className="lib__link lib__link--icon" href={LINKS.github} target="_blank" rel="noopener noreferrer" aria-label="Pin UI on GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
              />
            </svg>
          </a>
        </nav>
        <MobileMenu />
      </header>

      <main className="lib tqp" id="top">
        <section className="lib__intro">
          <motion.p className="lib__eyebrow" {...rise()}>
            Testimonials
          </motion.p>
          <motion.h1 className="lib__title" {...rise(0.05)}>
            What people are saying
          </motion.h1>
          <motion.p className="lib__lead tqp__lead" {...rise(0.1)}>
            Word for word, from the replies on X — each card links to the person who said it.
          </motion.p>
        </section>

        <div className="tqp__grid">
          {TESTIMONIALS.map((item, i) => (
            <motion.div
              className="tqp__item"
              key={item.handle}
              {...(reduced
                ? {}
                : {
                    initial: { opacity: 0, y: 24 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.2 },
                    transition: { ...softSpring, delay: (i % 3) * 0.06 },
                  })}
            >
              <TestimonialCard item={item} id={`tqp-${i}`} still />
            </motion.div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
