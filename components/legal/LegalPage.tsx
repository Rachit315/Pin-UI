import type { ReactNode } from "react";
import Link from "next/link";
import SiteFooter from "../hero/SiteFooter";
import SmoothScroll from "../hero/SmoothScroll";
import "@/app/hero.css";
import "@/app/sections.css";
import "./legal.css";

/**
 * The shell both legal pages sit in.
 *
 * A policy is somewhere you arrive from a footer link, read, and leave. It
 * carries no site nav for that reason: no masthead across the top and no rail
 * riding down the side, only the way back, which stays put at the top of the
 * column for as long as you are reading. The `.site` wrapper still supplies
 * the type scale and every colour token, so the page belongs to the app rather
 * than reading as a document appended to it.
 */
export default function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  /** The date the wording last changed, as an ISO day. */
  updated: string;
  /** One line under the title, saying what the page is for in plain words. */
  summary: string;
  children: ReactNode;
}) {
  const shown = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="site">
      <main className="legal" id="top">
        {/*
          The way out — and the only navigation on the page. It sticks to the
          top of the column rather than scrolling away, because a policy is
          long and the point at which somebody wants to leave one is rarely
          the top of it. The band behind it is the page's own paper, so the
          prose passes under it cleanly.
        */}
        <div className="legal__nav">
          <Link className="legal__back" href="/">
            <span className="legal__backArrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 5 8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Back to home
          </Link>
        </div>

        <h1 className="legal__title">{title}</h1>
        <p className="legal__summary">{summary}</p>
        <p className="legal__updated">
          Last updated <time dateTime={updated}>{shown}</time>
        </p>

        <div className="legal__body">{children}</div>
      </main>

      <SiteFooter />
      <SmoothScroll />
    </div>
  );
}
