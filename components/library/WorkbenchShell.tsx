"use client";

import type React from "react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import { softSpring } from "@/lib/motion";
import { LIBRARY } from "./registry";
import CreatorDot from "./CreatorDot";
import "@/app/hero.css";
import "./workbench.css";

/**
 * The workbench frame — Figma 345:21.
 *
 * It lives in the route's layout rather than in the page, so the sidebar
 * survives navigation between components. That is what lets the pin travel to
 * the entry you picked instead of being redrawn in its new place, and it means
 * the list does not flash on every hop.
 *
 * The mark is the theme switch here too, the same gesture as everywhere else on
 * the site; the wordmark beside it goes home.
 */
export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  /* where the pin sits, measured rather than calculated from the type scale */
  const [pinTop, setPinTop] = useState<number | null>(null);
  /* and the rail it rides, spanning the first row's centre to the last one's */
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  const activeIndex = Math.max(
    0,
    LIBRARY.findIndex((entry) => pathname === `/components/${entry.slug}`),
  );

  /*
   * The pin is placed from the real position of the active row, so it stays on
   * it through a font swap or a resize rather than drifting off a row whose
   * height the stylesheet changed.
   */
  useLayoutEffect(() => {
    const centre = (item: HTMLLIElement) => item.offsetTop + item.offsetHeight / 2;

    const place = () => {
      const list = listRef.current;
      const item = itemRefs.current[activeIndex];
      const rows = itemRefs.current.filter(Boolean) as HTMLLIElement[];
      if (!list || !item || rows.length === 0) return;
      /*
       * A closed panel is zero pixels wide, and everything in it measures as
       * such. Reading the rows in that state put the rail and the pin on
       * figures from a layout nobody can see, and reopening never corrected
       * them — so while it is shut, the last good measurement stands.
       */
      if (list.offsetWidth === 0) return;

      setPinTop(centre(item));
      const first = centre(rows[0]);
      const last = centre(rows[rows.length - 1]);
      /* the design runs the rail a little past the last row rather than
         stopping dead on it, which is what stops it reading as a scrollbar */
      setRail({ top: first, height: Math.max(0, last - first) + 8 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    /* `collapsed` is a dependency so the panel re-measures as it reopens */
  }, [activeIndex, collapsed]);

  return (
    <div className="site site--wb" data-collapsed={collapsed}>
      <nav className="wbnav" aria-label="Components">
        <div className="wbnav__head">
          <div className="wbnav__lockup">
            {/* the mark is the switch; the wordmark beside it goes home */}
            <ThemeMark
              buttonClassName="wbnav__markButton"
              markClassName="wbnav__mark"
              tap={0.88}
            />

            <Link className="wbnav__word" href="/">
              Pin UI
            </Link>
          </div>

          <button
            type="button"
            className="wbnav__collapse"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse the component list"
            title="Collapse the component list"
          >
            {/* lucide: panel-left-close */}
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M28 14.6667C28 9.63835 28 7.1242 26.4379 5.56209C24.8759 4 22.3616 4 17.3333 4H14.6667C9.63835 4 7.1242 4 5.56209 5.56209C4 7.1242 4 9.63835 4 14.6667V17.3333C4 22.3616 4 24.8759 5.56209 26.4379C7.1242 28 9.63835 28 14.6667 28H17.3333C22.3616 28 24.8759 28 26.4379 26.4379C28 24.8759 28 22.3616 28 17.3333V14.6667Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 4V28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M21.3333 12L19.8557 13.1716C18.1741 14.5049 17.3333 15.1716 17.3333 16C17.3333 16.8284 18.1741 17.4951 19.8557 18.8284L21.3333 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <h1 className="wbnav__title">Components</h1>

        <ul className="wbnav__list" ref={listRef}>
          {rail && (
            <span
              className="wbnav__rail"
              aria-hidden="true"
              style={{ top: rail.top, height: rail.height }}
            />
          )}

          {pinTop !== null && (
            /*
              The travel is a CSS transition rather than an animated value: it
              is one number moving between known points, so the stylesheet can
              do it without the animation runtime — and it still lands in the
              right place on a page that never produced a frame.
            */
            <span className="wbnav__pin" aria-hidden="true" style={{ top: pinTop }} />
          )}

          {LIBRARY.map((entry, i) => (
            <li
              className="wbnav__item"
              key={entry.slug}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <Link
                className="wbnav__link"
                href={`/components/${entry.slug}`}
                aria-current={i === activeIndex ? "page" : undefined}
              >
                <span className="wbnav__text">{entry.name}</span>
                {entry.isNew && <span className="wbnav__new">New</span>}
                {entry.creator && <CreatorDot {...entry.creator} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {collapsed && (
        <button
          type="button"
          className="wbstage__expand"
          onClick={() => setCollapsed(false)}
          aria-label="Show the component list"
          title="Show the component list"
        >
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M28 14.6667C28 9.63835 28 7.1242 26.4379 5.56209C24.8759 4 22.3616 4 17.3333 4H14.6667C9.63835 4 7.1242 4 5.56209 5.56209C4 7.1242 4 9.63835 4 14.6667V17.3333C4 22.3616 4 24.8759 5.56209 26.4379C7.1242 28 9.63835 28 14.6667 28H17.3333C22.3616 28 24.8759 28 26.4379 26.4379C28 24.8759 28 22.3616 28 17.3333V14.6667Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 4V28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M21.3333 12L19.8557 13.1716C18.1741 14.5049 17.3333 15.1716 17.3333 16C17.3333 16.8284 18.1741 17.4951 19.8557 18.8284L21.3333 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {children}
    </div>
  );
}
