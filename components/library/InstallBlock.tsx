"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { spring, swapQuick } from "@/lib/motion";
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
};

const MANAGERS: Manager[] = [
  {
    id: "npm",
    label: "npm",
    run: "npx",
  },
  {
    id: "pnpm",
    label: "pnpm",
    run: "pnpm dlx",
  },
  {
    id: "bun",
    label: "bun",
    run: "bunx --bun",
  },
  {
    id: "yarn",
    label: "yarn",
    run: "yarn dlx",
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
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              className="install__copyFace"
              initial={reduced ? false : { opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.9 }}
              transition={swapQuick}
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
