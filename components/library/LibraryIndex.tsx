"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import MobileMenu from "../MobileMenu";
import ThemeHint from "../ThemeHint";
import SiteFooter from "../hero/SiteFooter";
import ComponentCard from "./ComponentCard";
import { LIBRARY, byCategory, type Entry } from "./registry";
import { LINKS } from "@/lib/links";
import { softSpring } from "@/lib/motion";
import "./library.css";

/** How many of the newest open the page, ahead of the shelves. */
const LATEST = 3;

/** A line under each shelf's name, saying what is on it. */
const NOTES: Record<string, string> = {
  controls: "Things you press, pull and type into — each with a feel of its own.",
  cards: "Self-contained cards that carry a whole small flow.",
  media: "Sound you can see: recording, scrubbing and playing back.",
  lists: "Picking people, counting blocks of time.",
};

type Shelf = { id: string; name: string; note: string; entries: Entry[] };

const SHELVES: Shelf[] = [
  {
    id: "latest",
    name: "Just added",
    note: "The newest three, straight off the board.",
    entries: LIBRARY.slice(0, LATEST),
  },
  ...byCategory().map((group) => ({
    id: group.id,
    name: group.name,
    note: NOTES[group.id] ?? "",
    entries: group.entries,
  })),
];


/**
 * The library — every component, sorted onto shelves.
 *
 * A page of its own rather than a corner of the workbench: you come here to
 * look across everything, so the cards get the whole width and there is no
 * list beside them saying the same thing twice. The shelves are the same
 * categories the workbench's sidebar is grouped by, and the bar under the
 * title jumps between them and keeps your place as you scroll.
 */
export default function LibraryIndex() {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(SHELVES[0].id);
  const [scrolled, setScrolled] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  /* which shelf is under the middle of the screen */
  useEffect(() => {
    const sections = SHELVES.map((shelf) => document.getElementById(shelf.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (records) => {
        const seen = records.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setCurrent(seen[0].target.id);
      },
      { rootMargin: "-38% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* keep the lit chip in view when the bar scrolls sideways on a phone */
  useEffect(() => {
    const chip = jumpRef.current?.querySelector<HTMLElement>(`[data-shelf="${current}"]`);
    const bar = jumpRef.current;
    if (!chip || !bar || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: chip.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
  }, [current, reduced]);

  function jump(id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setCurrent(id);
  }

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

      <main className="lib" id="top">
        <section className="lib__intro">
          <motion.p className="lib__eyebrow" {...rise()}>
            The library
          </motion.p>
          <motion.h1 className="lib__title" {...rise(0.05)}>
            All components
            <span className="lib__total" aria-label={`${LIBRARY.length} components`}>
              {LIBRARY.length}
            </span>
          </motion.h1>
          <motion.p className="lib__lead" {...rise(0.1)}>
            Every one started as a Pinterest pin and ends as a single file you own. Each card plays
            as it comes into view; open one to play with it live and copy the source.
          </motion.p>
        </section>

        <div className="lib__jumpWrap">
          <div className="lib__jump" ref={jumpRef} role="navigation" aria-label="Shelves">
            {SHELVES.map((shelf) => (
              <button
                key={shelf.id}
                type="button"
                className="lib__chip"
                data-shelf={shelf.id}
                aria-current={current === shelf.id ? "true" : undefined}
                onClick={() => jump(shelf.id)}
              >
                {shelf.name}
                <span className="lib__chipCount">{shelf.entries.length}</span>
              </button>
            ))}
          </div>
        </div>

        {SHELVES.map((shelf) => (
          <section className="lib__shelf" id={shelf.id} key={shelf.id} aria-labelledby={`${shelf.id}-title`}>
            <header className="lib__shelfHead">
              <h2 className="lib__shelfTitle" id={`${shelf.id}-title`}>
                {shelf.name}
                <span className="lib__shelfCount">{shelf.entries.length}</span>
              </h2>
              <p className="lib__shelfNote">{shelf.note}</p>
            </header>
            <ul className="shelf__grid">
              {shelf.entries.map((entry, i) => (
                <ComponentCard key={entry.slug} entry={entry} index={i % 3} />
              ))}
            </ul>
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
