"use client";

import ComponentCard from "../library/ComponentCard";
import ViewAllCard from "./ViewAllCard";
import { LANDING_SHOWN, LIBRARY } from "../library/registry";

/**
 * The component shelf under the hero.
 *
 * The heading and the note rise in as they are scrolled to — a CSS
 * scroll-driven animation (.pin-reveal), so on a phone, where the heading is
 * already on the first screen, it is painted at once instead of waiting for
 * JavaScript. Each card handles its own entrance, because each also owns
 * when its clip is allowed to load.
 *
 * The shelf is a preview — Figma 502:291: the newest five, and a sixth cell
 * that opens the whole library, so the grid closes on two full rows of three.
 * The same count decides which components wear the "New" tag (registry.ts).
 */
const SHOWN = LANDING_SHOWN;
export default function UniqueSection() {
  return (
    <section className="shelf" id="components" aria-labelledby="components-heading">
      {/*
        Heading and standfirst enter together, as one block. On a stagger the
        pair is briefly further apart than it ends up, and the shelf reads as
        badly spaced for as long as that lasts.
      */}
      <div className="shelf__head pin-reveal">
        <h2 id="components-heading" className="shelf__title">Components worth building with</h2>
        <p className="shelf__lead">
          Thoughtfully crafted UI components designed to give your next project a distinctive edge.
        </p>
      </div>

      <ul className="shelf__grid">
        {LIBRARY.slice(0, SHOWN).map((entry, i) => (
          <ComponentCard key={entry.slug} entry={entry} index={i} />
        ))}
        <ViewAllCard index={Math.min(SHOWN, LIBRARY.length)} total={LIBRARY.length} arrowAtRest />
      </ul>

    </section>
  );
}
