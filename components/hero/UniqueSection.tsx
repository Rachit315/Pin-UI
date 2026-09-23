"use client";

import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import ComponentCard from "../library/ComponentCard";
import PinterestPeek from "./PinterestPeek";
import { LIBRARY } from "../library/registry";

/**
 * The component shelf under the hero.
 *
 * The heading and the note enter once they have actually been scrolled to
 * rather than on page load, and `once` so the section does not re-animate
 * every time it passes the viewport — a shelf that replays itself on every
 * scroll up reads as a glitch rather than a flourish. Each card handles its own
 * entrance, because each also owns when its clip is allowed to load.
 */
export default function UniqueSection() {
  const reduced = useReducedMotion();

  const rise = (delay = 0) =>
    reduced
      ? {}
      : ({
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { ...softSpring, delay },
        } as const);

  return (
    <section className="shelf" id="components" aria-labelledby="components-heading">
      {/*
        Heading and standfirst enter together, as one block. On a stagger the
        pair is briefly further apart than it ends up, and the shelf reads as
        badly spaced for as long as that lasts.
      */}
      <motion.div className="shelf__head" {...rise()}>
        <h2 id="components-heading" className="shelf__title">Components that are unique</h2>
        {/* the mark is set inline in the sentence, the way the hero's claim does */}
        <p className="shelf__lead">
          Every one of them started as a{" "}
          <PinterestPeek /> pin and ends as something you can paste straight into
          your project.
        </p>
      </motion.div>

      <ul className="shelf__grid">
        {LIBRARY.map((entry, i) => (
          <ComponentCard key={entry.slug} entry={entry} index={i} />
        ))}
      </ul>

      <motion.p className="shelf__note" {...rise(0.12)}>
        3 New components every week…
      </motion.p>
    </section>
  );
}
