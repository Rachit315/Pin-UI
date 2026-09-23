"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { softSpring, spring } from "@/lib/motion";
import { useCopy } from "./useCopy";

/**
 * The one-line install.
 *
 * There is no Pin UI CLI to publish: shadcn's own `add` takes any URL that
 * answers with a registry item, and `/r/<slug>.json` does. So the command is
 * only a link, and the four tabs are the four ways of running somebody else's
 * binary once.
 */

type Manager = {
  id: string;
  label: string;
  /** How this one runs a package it has not installed. */
  run: string;
  /** Brand mark, drawn rather than fetched, so it themes and costs nothing. */
  icon: React.ReactNode;
};

const MANAGERS: Manager[] = [
  {
    id: "npm",
    label: "npm",
    run: "npx",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect width="16" height="16" rx="2.5" fill="#cb3837" />
        <path d="M3 4.4h10v7.2h-2.6V6.9H9.2v4.7H3z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "pnpm",
    label: "pnpm",
    run: "pnpm dlx",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect width="16" height="16" rx="2.5" fill="#f9ad00" />
        <g fill="#fff">
          <rect x="2.6" y="2.6" width="3.1" height="3.1" rx="0.4" />
          <rect x="6.45" y="2.6" width="3.1" height="3.1" rx="0.4" />
          <rect x="10.3" y="2.6" width="3.1" height="3.1" rx="0.4" />
          <rect x="6.45" y="6.45" width="3.1" height="3.1" rx="0.4" />
          <rect x="10.3" y="6.45" width="3.1" height="3.1" rx="0.4" />
          <rect x="6.45" y="10.3" width="3.1" height="3.1" rx="0.4" />
        </g>
      </svg>
    ),
  },
  {
    id: "bun",
    label: "bun",
    run: "bunx --bun",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="#fbf0df" stroke="#1a1a1a" strokeWidth="0.8" />
        <circle cx="5.6" cy="7.6" r="0.9" fill="#1a1a1a" />
        <circle cx="10.4" cy="7.6" r="0.9" fill="#1a1a1a" />
        <path d="M6.4 10.2c.5.5 2.7.5 3.2 0" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "yarn",
    label: "yarn",
    run: "yarn dlx",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7.2" fill="#2c8ebb" />
        <path
          d="M11.4 10.6c-1 .1-1.7.4-2.3.8-.5.3-1.4.4-2 .2-.5-.2-.5-.7.1-1 .9-.5 1.5-1.4 1.7-2.4.1-.6-.1-1.2-.5-1.6.5-1 .3-2-.4-2.7-.5.6-.8 1.3-.9 2-.6.5-1 1.2-1.1 2-.1.7 0 1.4.3 2-.2.5-.3 1-.3 1.5 0 .4.3.7.7.7h4.4c.5 0 .8-.3.8-.7 0-.5-.3-.8-.5-.8Z"
          fill="#fff"
        />
      </svg>
    ),
  },
];

export default function InstallBlock({ url }: { url: string }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { state, copy } = useCopy();
  const lineRef = useRef<HTMLElement>(null);

  const manager = MANAGERS[active];
  /* the URL is quoted because a shell would otherwise eat the query string */
  const command = `${manager.run} shadcn@latest add "${url}"`;

  return (
    <div className="install">
      <div className="install__bar">
        <div className="install__tabs" role="tablist" aria-label="Package manager">
          {MANAGERS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`install__tab${i === active ? " install__tab--on" : ""}`}
              onClick={() => setActive(i)}
            >
              <span className="install__icon">{item.icon}</span>
              {item.label}
              {i === active && (
                <motion.span
                  className="install__rule"
                  layoutId={reduced ? undefined : "install-tab"}
                  transition={spring}
                />
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="install__copy"
          aria-label="Copy the install command"
          onClick={() => copy(command, lineRef.current)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state}
              className="install__copyFace"
              initial={reduced ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
              transition={softSpring}
            >
              {state === "done" ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : state === "failed" ? (
                <span className="install__hint">Selected — press ⌘C</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
                  <path
                    d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <div className="install__line">
        <code ref={lineRef} tabIndex={0}>
          <span className="install__run">{manager.run}</span> shadcn@latest add{" "}
          <span className="install__url">&quot;{url}&quot;</span>
        </code>
      </div>
    </div>
  );
}
