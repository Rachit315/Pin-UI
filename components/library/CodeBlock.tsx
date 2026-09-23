"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { softSpring, spring } from "@/lib/motion";
import { useCopy } from "./useCopy";

export type CodePane = { name: string; lang: "tsx" | "css"; code: string };

/* ----------------------------------------------------------- highlighting -- */

type Token = { text: string; kind: string };

/*
 * One pass, one regular expression.
 *
 * The alternation is ordered so that comments and strings are matched before
 * anything that could appear inside them — which is what stops the classic
 * bug where a keyword inside a string, or a quote inside a comment, drags the
 * colouring off for the rest of the file. Anything unmatched is emitted as
 * plain text, so worst case a token is simply left uncoloured.
 */
const TSX =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')|\b(import|export|default|from|const|let|var|function|return|if|else|for|while|type|interface|extends|new|await|async|try|catch|finally|typeof|as|in|of|null|undefined|true|false|void|this)\b|\b(\d+\.?\d*)\b|([A-Z][A-Za-z0-9_]*)/g;

const CSS =
  /(\/\*[\s\S]*?\*\/)|("(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')|(--[\w-]+|@[\w-]+)|(^[ \t]*[.#&:][^\n{,]*(?=[,{\n])|^[ \t]*[a-z][\w-]*(?=\s*\{))|\b(\d+\.?\d*(?:px|em|rem|%|s|ms|deg|cqw|vw|vh|dvh|fr)?)\b/gm;

function tokenize(code: string, lang: "tsx" | "css"): Token[] {
  const re = lang === "tsx" ? TSX : CSS;
  const kinds =
    lang === "tsx"
      ? ["comment", "string", "keyword", "number", "type"]
      : ["comment", "string", "prop", "selector", "number"];

  const out: Token[] = [];
  let last = 0;
  re.lastIndex = 0;

  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > last) out.push({ text: code.slice(last, m.index), kind: "plain" });
    const group = m.slice(1).findIndex(Boolean);
    out.push({ text: m[0], kind: group === -1 ? "plain" : kinds[group] });
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push({ text: code.slice(last), kind: "plain" });
  return out;
}

/* -------------------------------------------------------------- component -- */

/**
 * The source of the component on the page, straight off disk.
 *
 * Each file gets a tab. Copy takes the whole file, because half a component is
 * no use to anybody — the point of the page is that what lands in the clipboard
 * runs.
 */
export default function CodeBlock({ panes, label }: { panes: CodePane[]; label?: string }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { state, copy } = useCopy();

  const preRef = useRef<HTMLPreElement>(null);

  const pane = panes[active];
  const tokens = useMemo(() => tokenize(pane.code, pane.lang), [pane]);
  const lines = pane.code.split("\n").length;

  return (
    <div className="code">
      <div className="code__bar">
        <div className="code__tabs" role="tablist" aria-label={label ?? "Source files"}>
          {panes.map((item, i) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`code__tab${i === active ? " code__tab--on" : ""}`}
              onClick={() => setActive(i)}
            >
              {item.name}
              {i === active && (
                <motion.span
                  className="code__tabRule"
                  layoutId={reduced ? undefined : `code-tab-${label ?? "src"}`}
                  transition={spring}
                />
              )}
            </button>
          ))}
        </div>

        <button type="button" className="code__copy" onClick={() => copy(pane.code, preRef.current)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state}
              className="code__copyFace"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={softSpring}
            >
              {state === "done" ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : state === "failed" ? (
                <>Selected — press ⌘C</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
                    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                  </svg>
                  Copy file
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <div className="code__scroll">
        <pre className="code__pre" ref={preRef} tabIndex={0}>
          <code>
            {tokens.map((token, i) =>
              token.kind === "plain" ? (
                token.text
              ) : (
                <span key={i} className={`tok tok--${token.kind}`}>
                  {token.text}
                </span>
              ),
            )}
          </code>
        </pre>
      </div>

      <p className="code__foot">
        {pane.name} · {lines} lines
      </p>
    </div>
  );
}
