"use client";

import type React from "react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import ThemeMark from "../ThemeMark";
import { softSpring } from "@/lib/motion";
import { LIBRARY, byCategory } from "./registry";
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
/* the library on its shelves — fixed for the life of the page */
const GROUPS = byCategory();

/*
 * Bring the open component's row into the list's view when it is scrolled out
 * of it — a component opened from a link deep in the list should not leave its
 * own row hidden. Only the list moves: scrollIntoView would scroll the page too.
 */
function reveal(list: HTMLElement, item: HTMLElement) {
  if (getComputedStyle(list).overflowX === "auto") {
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = Math.max(0, left - list.clientWidth / 2 + item.offsetWidth / 2);
    }
    return;
  }
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  /* the faded edges cover about this much, so a row under them counts as hidden */
  const pad = 28;
  if (top < list.scrollTop + pad || bottom > list.scrollTop + list.clientHeight - pad) {
    list.scrollTop = Math.max(0, top - list.clientHeight / 2 + item.offsetHeight / 2);
  }
}

export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  /* where the pin sits, measured rather than calculated from the type scale */
  const [pinTop, setPinTop] = useState<number | null>(null);
  /* and the rail it rides, spanning the first row's centre to the last one's */
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  const active = LIBRARY.find((entry) => pathname === `/components/${entry.slug}`);
  /* the shelf the open component sits on: the rail runs down that one only */
  const activeGroup = GROUPS.find((group) => group.id === active?.category);

  /*
   * The pin is placed from the real position of the active row, so it stays on
   * it through a font swap or a resize rather than drifting off a row whose
   * height the stylesheet changed.
   */
  useLayoutEffect(() => {
    const centre = (item: HTMLLIElement) => item.offsetTop + item.offsetHeight / 2;

    const place = () => {
      const list = listRef.current;
      if (!list) return;
      /*
       * A closed panel is zero pixels wide, and everything in it measures as
       * such. Reading the rows in that state put the rail and the pin on
       * figures from a layout nobody can see, and reopening never corrected
       * them — so while it is shut, the last good measurement stands.
       */
      if (list.offsetWidth === 0) return;

      const item = active ? itemRefs.current[active.slug] : null;
      setPinTop(item ? centre(item) : null);
      if (item) reveal(list, item);

      const rows = (activeGroup?.entries ?? [])
        .map((entry) => itemRefs.current[entry.slug])
        .filter(Boolean) as HTMLLIElement[];
      if (rows.length === 0) {
        setRail(null);
        return;
      }
      const first = centre(rows[0]);
      const last = centre(rows[rows.length - 1]);
      /* the design runs the rail a little past the last row rather than
         stopping dead on it, which is what stops it reading as a scrollbar */
      setRail({ top: first - 8, height: Math.max(0, last - first) + 16 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    /* `collapsed` is a dependency so the panel re-measures as it reopens */
    // both are found in module-level constants, so they keep their identity between renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.slug, collapsed]);

  /*
   * The list scrolls inside the panel with no scrollbar of its own. What says
   * there is more is the edge fading where rows run on, and the meter under the
   * list filling as you go. Both are driven straight from the scroll position
   * into the DOM — one write a frame, no re-render — so scrolling the list
   * costs the page nothing.
   */
  useEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const across = getComputedStyle(list).overflowX === "auto";
      const max = across ? list.scrollWidth - list.clientWidth : list.scrollHeight - list.clientHeight;
      const at = across ? list.scrollLeft : list.scrollTop;
      /* sub-pixel scroll positions stop a hair short of the end; count that as there */
      const progress = max > 1 ? (at >= max - 1 ? 1 : Math.max(0, at / max)) : 1;
      nav.dataset.scrollable = String(max > 1);
      nav.dataset.atStart = String(at <= 1);
      nav.dataset.atEnd = String(at >= max - 1);
      nav.style.setProperty("--wbnav-progress", progress.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    list.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(list);
    for (const child of Array.from(list.children)) observer.observe(child);
    void document.fonts?.ready.then(schedule);
    return () => {
      list.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  /* the meter's control: a page further down, or back to the top from the end */
  function step() {
    const list = listRef.current;
    if (!list) return;
    const behavior = reduced ? "auto" : "smooth";
    const atEnd = navRef.current?.dataset.atEnd === "true";
    list.scrollTo({ top: atEnd ? 0 : list.scrollTop + list.clientHeight * 0.7, behavior });
  }

  return (
    <div className="site site--wb" data-collapsed={collapsed}>
      <nav className="wbnav" aria-label="Components" ref={navRef}>
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

        <h1 className="wbnav__title">
          <Link className="wbnav__titleLink" href="/components">
            Components
          </Link>
        </h1>

        <div className="wbnav__list" ref={listRef}>
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

          {GROUPS.map((group) => (
            <section className="wbnav__group" key={group.id} aria-labelledby={`wbnav-${group.id}`}>
              <h2 className="wbnav__groupLabel" id={`wbnav-${group.id}`}>
                {group.name}
              </h2>
              <ul className="wbnav__rows">
                {group.entries.map((entry) => (
                  <li
                    className="wbnav__item"
                    key={entry.slug}
                    ref={(el) => {
                      itemRefs.current[entry.slug] = el;
                    }}
                  >
                    <Link
                      className="wbnav__link"
                      href={`/components/${entry.slug}`}
                      aria-current={entry.slug === active?.slug ? "page" : undefined}
                    >
                      <span className="wbnav__text">{entry.name}</span>
                      {entry.isNew && <span className="wbnav__new">New</span>}
                      {entry.creator && <CreatorDot {...entry.creator} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* how far down the list you are; hidden while it all fits */}
        <div className="wbnav__meter" aria-hidden="true">
          <span className="wbnav__track">
            <span className="wbnav__fill" />
          </span>
          <button
            type="button"
            className="wbnav__more"
            onClick={step}
            tabIndex={-1}
            title="Scroll the list"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
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
