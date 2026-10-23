"use client";

import { motion, type Variants } from "motion/react";
import { GeistSans } from "geist/font/sans";
import { ICON_PATHS, WORDMARK_PATH } from "./caremetric-mark";
import "./caremetric-footer.css";

/**
 * CareMetric Footer — a soft green panel with a giant mark.
 *
 * A rounded panel rises into place, tinted by a gradient texture under a hue
 * wash; the logo and four columns of links fade in on a stagger, and the
 * CareMetric mark — three blobs and the wordmark, set huge — pops in and bleeds
 * off the bottom edge. Figma's coordinates hold on desktop; below 1200px it
 * becomes a flowing layout, and on a phone the links fold to two columns.
 */

/* Geist ships with the `geist` package and loads from local files, so nothing is fetched from Google at build time */
const LOGO = "/blocx/caremetric-footer/logo.svg";
const TEXTURE = "/blocx/caremetric-footer/texture.webp";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const COLUMNS: { title: string; links: string[] }[] = [
  { title: "Overview", links: ["How It Works", "Integrations", "System Architecture", "Executive Reporting"] },
  { title: "For Hospitals", links: ["For Clinic Networks", "Operational Efficiency", "Throughput Optimization", "Staff Allocation"] },
  { title: "Case Studies", links: ["Insights & Research", "Implementation Guide", "FAQ", "Support"] },
  { title: "About", links: ["Leadership", "Careers", "Contact", "Press"] },
];

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-");

const fade: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_OUT, delay },
  }),
};

export default function Footer2() {
  return (
    <main className={`cmf-page ${GeistSans.variable}`}>
      <footer className="cmf" aria-label="CareMetric">
        {/* the rounded panel rises into place */}
        <motion.div
          className="cmf__panel"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        >
          {/* Figma's background: #f1f2ef, the gradient texture at 59%, then a hue wash that turns it green */}
          <img className="cmf__texture" src={TEXTURE} alt="" draggable={false} />
          <span className="cmf__hue" aria-hidden />
        </motion.div>

        <div className="cmf__stage">
          <motion.a
            href="#top"
            className="cmf__brand"
            aria-label="CareMetric home"
            variants={fade}
            initial="hidden"
            animate="show"
            custom={0.35}
            onClick={(e) => e.preventDefault()}
          >
            <img src={LOGO} alt="CareMetric" width={204} height={50} draggable={false} />
          </motion.a>

          <nav className="cmf__cols" aria-label="Footer">
            {COLUMNS.map((col, ci) => (
              <div key={col.title} className="cm__col">
                <motion.h2
                  className="cmf__heading"
                  variants={fade}
                  initial="hidden"
                  animate="show"
                  custom={0.45 + ci * 0.08}
                >
                  {col.title}
                </motion.h2>
                <ul className="cmf__list">
                  {col.links.map((l, li) => (
                    <motion.li
                      key={l}
                      variants={fade}
                      initial="hidden"
                      animate="show"
                      custom={0.52 + ci * 0.08 + li * 0.045}
                    >
                      <a className="cmf__link" href={`#${slug(l)}`} onClick={(e) => e.preventDefault()}>
                        {l}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <motion.p className="cmf__copy" variants={fade} initial="hidden" animate="show" custom={0.95}>
            © 2026 CareMetric. All rights reserved.
          </motion.p>

          {/* giant mark bleeding off the bottom edge: blobs pop in, the wordmark rises */}
          <svg className="cmf__mark" viewBox="0 0 1440 354" aria-hidden>
            {ICON_PATHS.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                className="cmf__mark-shape"
                style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.7 + i * 0.12 }}
              />
            ))}
            <motion.path
              d={WORDMARK_PATH}
              className="cmf__mark-shape"
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.9 }}
            />
          </svg>
        </div>
      </footer>
    </main>
  );
}
