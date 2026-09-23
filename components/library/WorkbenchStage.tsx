"use client";

import { useState } from "react";
import CodeBlock, { type CodePane } from "./CodeBlock";
import InstallBlock from "./InstallBlock";
import BalanceCard from "./BalanceCard";
import CartCard from "./CartCard";
import SessionList from "./SessionList";
import type { Entry } from "./registry";
import { LINKS } from "@/lib/links";

/**
 * The stage — Figma 345:21.
 *
 * The component runs live on its own field, inside the red-edged frame the
 * design draws, with a small floating bar under it: shrink, source, sound.
 *
 * Neither of the first two covers the component. Both give up the bottom of the
 * window and put what they have to say *under* the stage, so the thing you came
 * to look at stays where it was and you read by scrolling — the write-up and
 * the source arrive the same way, and they can both be open at once.
 */
export default function WorkbenchStage({
  entry,
  panes,
  registryUrl,
}: {
  entry: Entry;
  panes: CodePane[];
  /** Where `/r/<slug>.json` lives, resolved on the server from the site URL. */
  registryUrl: string;
}) {
  const [about, setAbout] = useState(false);
  const [showCode, setShowCode] = useState(false);
  /* off until asked for: a page that starts making noise is a hostile page */
  const [sound, setSound] = useState(false);

  /* either panel shortens the stage; the column below it is what scrolls */
  const opened = about || showCode;

  return (
    <main className={`wbstage${opened ? " wbstage--compact" : ""}`}>
      {/* Visually hidden but present for crawlers and screen readers */}
      <h1 className="sr-only">{entry.name} — Pin UI Component</h1>
      {/*
        Both of these are two-state switches between known values, so the
        stylesheet owns them rather than the animation runtime: they land on the
        right state whether or not a frame is ever produced, and they cost
        nothing while nobody is touching them.
      */}
      <div className={`wbstage__frame${opened ? " wbstage__frame--compact" : ""}`}>
        <div className="wbstage__field" style={{ background: entry.stage }} aria-hidden="true" />

        <div className="wbstage__hold">
          {/* the wall shot draws it at a 32px corner, not the block's own 40 */}
          {entry.slug === "session-list" && <SessionList corner={32} />}
          {/* the bar owns the sound here, so the card's own credit row stands down */}
          {entry.slug === "balance-card" && <BalanceCard sound={sound} credit={false} />}
          {entry.slug === "cart-card" && <CartCard sound={sound} />}
        </div>

        <div className="wbbar" role="toolbar" aria-label="Stage">
          <button
            type="button"
            className="wbbar__button"
            aria-pressed={about}
            aria-label={about ? "Close the write-up" : "Read about this component"}
            title={about ? "Close the write-up" : "Read about this component"}
            onClick={() => setAbout((on) => !on)}
          >
            {about ? (
              /* lucide: maximize */
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M2.5 6.66667V5C2.5 4.55797 2.6756 4.13405 2.98816 3.82149C3.30072 3.50893 3.72464 3.33333 4.16667 3.33333H6.66667M13.3333 3.33333H15.8333C16.2754 3.33333 16.6993 3.50893 17.0118 3.82149C17.3244 4.13405 17.5 4.55797 17.5 5V6.66667M17.5 13.3333V15C17.5 15.442 17.3244 15.866 17.0118 16.1785C16.6993 16.4911 16.2754 16.6667 15.8333 16.6667H13.3333M6.66667 16.6667H4.16667C3.72464 16.6667 3.30072 16.4911 2.98816 16.1785C2.6756 15.866 2.5 15.442 2.5 15V13.3333"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              /* lucide: minimize */
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M6.66667 2.5V5C6.66667 5.44203 6.49107 5.86595 6.17851 6.17851C5.86595 6.49107 5.44203 6.66667 5 6.66667H2.5"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17.5 6.66667H15C14.558 6.66667 14.134 6.49107 13.8215 6.17851C13.5089 5.86595 13.3333 5.44203 13.3333 5V2.5"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.5 13.3333H5C5.44203 13.3333 5.86595 13.5089 6.17851 13.8215C6.49107 14.134 6.66667 14.558 6.66667 15V17.5"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.3333 17.5V15C13.3333 14.558 13.5089 14.134 13.8215 13.8215C14.134 13.5089 14.558 13.3333 15 13.3333H17.5"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="wbbar__button"
            aria-pressed={showCode}
            aria-label={showCode ? "Hide the code" : "Show the code"}
            title={showCode ? "Hide the code" : "Show the code"}
            onClick={() => setShowCode((on) => !on)}
          >
            {/* lucide: code-xml */}
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 13.3333L18.3333 10L15 6.66667" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 6.66667L1.66667 10L5 13.3333" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.0833 3.33333L7.91667 16.6667" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            className="wbbar__button"
            aria-pressed={sound}
            aria-label={sound ? "Turn the sound off" : "Turn the sound on"}
            title={sound ? "Turn the sound off" : "Turn the sound on"}
            onClick={() => setSound((on) => !on)}
          >
            {/* lucide: volume-2 / volume-x */}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.16667 4.16667 5.41667 7.5H2.5v5h2.91667l3.75 3.33333V4.16667z" />
              {sound ? (
                <>
                  <path d="M12.9167 7.08333a3.75 3.75 0 0 1 0 5.83334" />
                  <path d="M15.25 5a7.5 7.5 0 0 1 0 10" />
                </>
              ) : (
                <>
                  <path d="m13.3333 7.91667 3.75 4.16666" />
                  <path d="m17.0833 7.91667-3.75 4.16666" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/*
        Everything the two panels have to say, in one column under the stage.
        It is rendered only when something is open, so the page has nothing to
        scroll past while the stage owns the whole window.
      */}
      {opened && (
        <div className="wbdoc">
          {about && (
            <section className="wbinfo" aria-label={`About ${entry.name}`}>
              <h2 className="wbinfo__name">{entry.name}</h2>
              <p className="wbinfo__lead">{entry.tagline}</p>

              <ul className="wbinfo__chips">
                {entry.highlights.map((chip) => (
                  <li className="wbinfo__chip" key={chip}>
                    {chip}
                  </li>
                ))}
              </ul>

              {entry.info.paragraphs.map((text, i) => (
                <p className="wbinfo__body" key={i} style={{ animationDelay: `${0.06 + i * 0.07}s` }}>
                  {text}
                </p>
              ))}

              {/*
                Every component has somewhere real to point now: its own pin
                where one was recorded, and the collection they were all found
                in otherwise. The apology this line used to carry — that it
                only went to Pinterest itself — is gone with it.
              */}
              <p className="wbinfo__credit">
                Inspired from Pinterest —{" "}
                <a
                  className="wbinfo__link"
                  href={entry.info.pin ?? LINKS.pinterest}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  find it here
                </a>
                .
              </p>
            </section>
          )}

          {showCode && (
            <section className="wbsrc" aria-label={`${entry.name} source`}>
              <h2 className="wbsrc__name">Install using CLI</h2>
              <p className="wbsrc__body">
                There is no Pin UI package to install — shadcn&rsquo;s own CLI takes any registry
                URL, and this component is served as one. It writes both files into{" "}
                <code className="wbsrc__mono">components/pinui</code> and tells you what it needs.
              </p>
              <InstallBlock url={registryUrl} />

              <h3 className="wbsrc__h3">Or copy it</h3>
              <p className="wbsrc__body">
                Copy both files into your project, keeping them side by side — the component imports
                its own stylesheet, so nothing else has to be wired up. The only dependency is{" "}
                <a
                  className="wbsrc__link"
                  href="https://motion.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Motion
                </a>
                .
              </p>
              <CodeBlock
                label={`${entry.slug}-usage`}
                panes={[{ name: "Usage", lang: "tsx", code: entry.usage }]}
              />

              <h3 className="wbsrc__h3">Props</h3>
              <div className="wbsrc__tableWrap">
                <table className="wbsrc__table">
                  <thead>
                    <tr>
                      <th scope="col">Prop</th>
                      <th scope="col">Type</th>
                      <th scope="col">Default</th>
                      <th scope="col">What it does</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.props.map((prop) => (
                      <tr key={prop.name}>
                        <td>
                          <code className="wbsrc__mono">{prop.name}</code>
                        </td>
                        <td>
                          <code className="wbsrc__mono wbsrc__mono--dim">{prop.type}</code>
                        </td>
                        <td>
                          {prop.fallback ? (
                            <code className="wbsrc__mono wbsrc__mono--dim">{prop.fallback}</code>
                          ) : (
                            <span className="wbsrc__mono wbsrc__mono--dim">—</span>
                          )}
                        </td>
                        <td>{prop.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="wbsrc__h3">The source</h3>
              <p className="wbsrc__body">
                The whole component, exactly as it is running above.{" "}
                {entry.origin.href ? (
                  <>
                    Ported from{" "}
                    <a
                      className="wbsrc__link"
                      href={entry.origin.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.origin.label}
                    </a>
                    .
                  </>
                ) : (
                  <>Ported from the original {entry.origin.label} build.</>
                )}
              </p>
              <CodeBlock label={entry.slug} panes={panes} />
            </section>
          )}
        </div>
      )}
    </main>
  );
}
