"use client";

import type React from "react";
import { Fragment, useLayoutEffect, useRef } from "react";
import type { Testimonial } from "@/lib/testimonials";

/**
 * One testimonial card — the landing row's and the testimonials page's.
 *
 * In the row a card rests showing who said it and opens to the quote, which
 * rises in a line at a time, each line through its own mask. On the page
 * (`still`) every quote is simply there: a page you came to in order to read
 * should not make you point at things first.
 *
 * Its colours are the site's card tokens, so it is red with white type in the
 * light state and a red-ruled white card in the crimson one, like the
 * component cards on the shelf above it.
 */
export default function TestimonialCard({
  item,
  id,
  open = false,
  still = false,
  inRow = false,
  hidden = false,
  onOpen,
}: {
  item: Testimonial;
  id: string;
  open?: boolean;
  /** quote always shown, nothing to open */
  still?: boolean;
  /** a still card that sits in the landing row's list rather than on the page */
  inRow?: boolean;
  /** a copy in the looping row: shown, but not read out or tabbed to */
  hidden?: boolean;
  onOpen?: (on: boolean) => void;
}) {
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const words = `“${item.quote}”`.split(" ");
  const tab = hidden ? -1 : undefined;

  /*
   * Which line each word fell on, so a line rises as one. Read from the real
   * layout (the panel is closed but its text is still laid out at full width),
   * and again whenever the card's width changes.
   */
  useLayoutEffect(() => {
    const quote = quoteRef.current;
    if (still || !quote) return;
    const mark = () => {
      let line = -1;
      let top = -Infinity;
      for (const w of Array.from(quote.children) as HTMLElement[]) {
        if (w.offsetTop > top + 2) {
          line += 1;
          top = w.offsetTop;
        }
        w.style.setProperty("--tq-line", String(line));
      }
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(quote);
    return () => observer.disconnect();
  }, [still]);

  const Tag = still && !inRow ? "article" : "li";

  return (
    <Tag
      className="tq__card"
      data-open={still || open}
      data-still={still || undefined}
      aria-hidden={hidden || undefined}
      /* a mouse opens it by pointing; touch goes through the plus instead */
      onPointerEnter={still ? undefined : (e: React.PointerEvent) => e.pointerType === "mouse" && onOpen?.(true)}
      onPointerLeave={still ? undefined : (e: React.PointerEvent) => e.pointerType === "mouse" && onOpen?.(false)}
      /*
       * Keyboard focus opens it, the way pointing does. A tap focuses the plus
       * too, on its way to clicking it — opening there would have the click
       * close it again — so only focus the browser marks as visible counts.
       */
      onFocus={
        still
          ? undefined
          : (e: React.FocusEvent) => {
              if ((e.target as Element).matches(":focus-visible")) onOpen?.(true);
            }
      }
      onBlur={
        still
          ? undefined
          : (e: React.FocusEvent) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) onOpen?.(false);
            }
      }
    >
      <div className="tq__face">
        <div className="tq__top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="tq__photo"
            src={`/testimonials/${item.handle}.jpg`}
            alt=""
            width={96}
            height={96}
            /*
             * Lazy loading watches layout position, and the row moves its cards
             * with a transform the browser does not count — a card drifting in
             * from the edge would arrive without its face. The row's seven are a
             * few kilobytes each, so they load up front; the page's stay lazy.
             */
            loading={still ? "lazy" : "eager"}
            decoding="async"
            draggable={false}
          />
          <a
            className="tq__x"
            href={`https://x.com/${item.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={tab}
            aria-label={`${item.name} on X (opens in a new tab)`}
            draggable={false}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>
          </a>
        </div>

        <div className="tq__meta">
          <span className="tq__who">
            <span className="tq__name">
              <span className="tq__nameText">{item.name}</span>
              {item.verified && (
                <svg className="tq__tick" viewBox="0 0 22 22" aria-label="Verified" role="img">
                  <path
                    className="tq__tickShape"
                    d="M20.4 11c0-1.3-.8-2.5-2-3 .4-1.3.1-2.7-.8-3.6-.9-.9-2.3-1.2-3.6-.8-.5-1.2-1.7-2-3-2s-2.5.8-3 2c-1.3-.4-2.7-.1-3.6.8-.9.9-1.2 2.3-.8 3.6-1.2.5-2 1.7-2 3s.8 2.5 2 3c-.4 1.3-.1 2.7.8 3.6.9.9 2.3 1.2 3.6.8.5 1.2 1.7 2 3 2s2.5-.8 3-2c1.3.4 2.7.1 3.6-.8.9-.9 1.2-2.3.8-3.6 1.2-.5 2-1.7 2-3z"
                  />
                  <path className="tq__tickMark" d="m6.9 11.2 2.7 2.6 5.5-5.6" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="tq__handle">@{item.handle}</span>
          </span>
          {!still && (
            <button
              type="button"
              className="tq__plus"
              aria-expanded={open}
              aria-controls={`${id}-quote`}
              aria-label={open ? `Hide what ${item.name} said` : `Read what ${item.name} said`}
              tabIndex={tab}
              onClick={() => onOpen?.(!open)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="tq__body" id={`${id}-quote`}>
        <div className="tq__clip">
          {still ? (
            <p className="tq__quote">“{item.quote}”</p>
          ) : (
            <p className="tq__quote" ref={quoteRef}>
              {/* the space sits between the masks, where a line can break on it */}
              {words.map((word, i) => (
                <Fragment key={i}>
                  <span className="tq__w">
                    <span className="tq__wi">{word}</span>
                  </span>{" "}
                </Fragment>
              ))}
            </p>
          )}
        </div>
      </div>
    </Tag>
  );
}
