"use client";

import Link from "next/link";
import PinMark from "../PinMark";
import PinField from "./PinField";
import { LINKS } from "@/lib/links";

/**
 * The foot of the page — Figma 377:871.
 *
 * Three bands, each on the page's own measure rather than the frame's pixels:
 * the lockup, the links and a line for anyone who is stuck; the board of pins
 * with the updates field pinned into it; and the small print.
 *
 * The links point at the landing page's own anchors from anywhere, so the same
 * footer works under the legal pages as well as under the shelf.
 */
export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot__top">
        <Link className="foot__brand" href="/#top" aria-label="Pin UI — home">
          <PinMark className="foot__mark" />
          <span className="foot__word" aria-hidden="true">
            Pin UI
          </span>
        </Link>

        <nav className="foot__nav" aria-label="Footer">
          <Link className="foot__navLink" href="/#top">
            Home
          </Link>
          <Link className="foot__navLink" href="/#components">
            Components
          </Link>
        </nav>

        <div className="foot__dm">
          <span className="foot__dmLabel">Facing an issue?? DM -</span>
          <a
            className="foot__social"
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
            className="foot__social"
            href={`mailto:${LINKS.email}`}
            aria-label={`Email Pin UI at ${LINKS.email}`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="2.6"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="m3.5 6.5 7.3 5.6a2 2 0 0 0 2.4 0l7.3-5.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>

      <PinField />

      <div className="foot__bar">
        <p className="foot__small">
          <span>Pin UI © 2026</span>
          <a className="foot__link" href={`mailto:${LINKS.email}`}>
            Support: {LINKS.email}
          </a>
        </p>

        <p className="foot__small">
          <Link className="foot__link" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="foot__link" href="/terms">
            Terms of Service
          </Link>
          <a className="foot__link" href="/sitemap.xml">
            Sitemap
          </a>
          <a className="foot__link" href="/robots.txt">
            robots.txt
          </a>
        </p>
      </div>
    </footer>
  );
}
