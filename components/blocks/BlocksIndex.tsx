"use client";

import Link from "next/link";
import BlocxMark from "./BlocxMark";
import BlocxFooter from "./BlocxFooter";
import GitHubStars from "../hero/GitHubStars";
import { IconArrowLeft, IconArrowUpRight, IconBookmark } from "./icons";
import { useSaved } from "./useSaved";
import { SHELF_ORDER, blocksIn, shelfName, type Block } from "@/lib/blocks";
import "./blocks.css";


/**
 * Blocx — the shelf.
 *
 * Every block, sorted into the section of a page it is for. Each card is a
 * soft tile holding the block's picture, inset, with its name, a "New" tag for
 * the latest arrivals and one line on what it is underneath. Hovering lifts the
 * tile, eases the picture in and sends the arrow out and back. A block you have
 * bookmarked wears the bookmark in the picture's corner.
 */
export default function BlocksIndex() {
  const { isSaved } = useSaved();

  return (
    <div className="blx blx--index">
      <header className="blx-head">
        <Link className="blx-back" href="/">
          <IconArrowLeft />
          Back to Pin UI
        </Link>
        {/* rises in as CSS (globals.css), so it is painted from the first frame rather than after hydration */}
        <div className="blx-head__mark pin-rise">
          <BlocxMark size="lg" />
        </div>
        {/* the repository, as in Pin UI's masthead: the octocat lifts away and the stars rise in */}
        <div className="blx-head__end">
          <GitHubStars className="pin-rise" style={{ "--rise-d": "0.08s" } as React.CSSProperties} />
        </div>
      </header>

      <main className="blx-shelves">
        {SHELF_ORDER.map((category, s) => {
          const blocks = blocksIn(category);
          if (!blocks.length) return null;
          return (
            <section key={category} id={category} className="blx-shelf" aria-labelledby={`shelf-${category}`}>
              {/* titles and cards rise as they scroll in (.pin-reveal, globals.css): never hidden waiting for script */}
              <h2 id={`shelf-${category}`} className="blx-shelf__title pin-reveal">
                {shelfName(category)}:
              </h2>
              <ul className="blx-grid">
                {blocks.map((block, i) => (
                  <li key={block.slug} className="pin-reveal" style={{ "--reveal-i": i % 3 } as React.CSSProperties}>
                    {/* the first shelf's opening row loads its pictures first */}
                    <BlockCard block={block} saved={isSaved(block.slug)} priority={s === 0 && i < 3} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>

      <BlocxFooter />
    </div>
  );
}

function BlockCard({ block, saved, priority = false }: { block: Block; saved: boolean; priority?: boolean }) {
  return (
    <Link className="blx-card" href={`/blocx/${block.slug}`} aria-label={`${block.name}${block.isNew ? ", new" : ""} — ${block.summary}`}>
      <span className="blx-card__frame" style={{ background: block.canvas }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="blx-card__img"
          src={block.thumb}
          alt=""
          width={960}
          height={756}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
        {saved && (
          <span className="blx-card__saved" title="Bookmarked">
            <IconBookmark filled />
          </span>
        )}
      </span>
      <span className="blx-card__caption" aria-hidden="true">
        <span className="blx-card__head">
          <span className="blx-card__name">{block.name}</span>
          {block.isNew && <span className="blx-card__new">New</span>}
          <span className="blx-card__arrow">
            <IconArrowUpRight />
            <IconArrowUpRight />
          </span>
        </span>
        <span className="blx-card__summary">{block.summary}</span>
      </span>
    </Link>
  );
}
