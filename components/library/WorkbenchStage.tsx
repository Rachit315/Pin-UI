"use client";

import { useState } from "react";
import CodeBlock, { type CodePane } from "./CodeBlock";
import InstallBlock from "./InstallBlock";
import BalanceCard from "./BalanceCard";
import CartCard from "./CartCard";
import SessionList from "./SessionList";
import Chips from "./Chips";
import ChipsEditor, { type ChipsSettings } from "./ChipsEditor";
import OtpInput from "./OtpInput";
import AddMember from "./AddMember";
import Weather from "./Weather";
import Recorder from "./Recorder";
import Taxi from "./Taxi";
import Joystick from "./Joystick";
import LiquidTabs from "./LiquidTabs";
import ThermalDial from "./ThermalDial";
import LampSwitch from "./LampSwitch";
import ChatRoom from "./ChatRoom";
import DynamicDropZone from "./DynamicDropZone";
import SwapCard from "./SwapCard";
import RequestChip from "./RequestChip";
import StageBar from "./StageBar";
import CalendarCard from "./CalendarCard";
import PromptComposer from "./PromptComposer";
import ProgressImage from "./ProgressImage";
import Magnify from "./Magnify";
import TaskCard from "./TaskCard";
import CopyPastePad from "./CopyPastePad";
import FileBox from "./FileBox";
import LiquidVoice from "./LiquidVoice";
import type { Entry } from "./registry";
import { LINKS } from "@/lib/links";
import { setTheme as setSiteTheme, usePinTheme } from "@/lib/theme";

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
  /*
   * On from the start, so a first visit hears the components as they were
   * made. Nothing plays on arrival: every cue is synthesised in response to a
   * press, and the audio engine is only built on that first gesture, so a
   * page that has not been touched stays silent.
   */
  const [sound, setSound] = useState(true);
  /* the Chips' layout and corner, edited live from the panel above them */
  const [chips, setChips] = useState<ChipsSettings>({ corner: 20, shadow: 50, rows: 2 });

  /*
   * The site's switch drives the components that have two themes: the light
   * page shows them light, the crimson state shows them dark, on their own
   * darker field. The rest keep the one field they were designed on.
   */
  const { theme: siteTheme } = usePinTheme();
  const theme = siteTheme === "crimson" ? "dark" : "light";
  const field = theme === "dark" && entry.stageDark ? entry.stageDark : entry.stage;

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
        <div className="wbstage__field" style={{ background: field }} aria-hidden="true" />

        <div
          className={`wbstage__hold${entry.fill ? " wbstage__hold--fill" : ""}${entry.wide ? " wbstage__hold--wide" : ""}${
            entry.spill ? " wbstage__hold--spill" : ""
          }`}
        >
          {/* the wall shot draws it at a 32px corner, not the block's own 40 */}
          {entry.slug === "session-list" && <SessionList corner={32} />}
          {/* the bar owns the sound here, so the card's own credit row stands down */}
          {entry.slug === "balance-card" && <BalanceCard sound={sound} credit={false} />}
          {entry.slug === "cart-card" && <CartCard sound={sound} />}
          {entry.slug === "chips" && (
            <Chips
              theme={theme}
              sound={sound}
              corner={chips.corner}
              shadow={chips.shadow}
              rows={chips.rows}
            />
          )}
          {entry.slug === "otp-input" && <OtpInput theme={theme} autoFocus />}
          {entry.slug === "add-member" && <AddMember theme={theme} />}
          {entry.slug === "weather" && <Weather theme={theme} />}
          {entry.slug === "recorder" && <Recorder theme={theme} sound={sound} autoFocus />}
          {entry.slug === "taxi" && <Taxi theme={theme} sound={sound} />}
          {entry.slug === "joystick" && <Joystick theme={theme} sound={sound} autoFocus />}
          {entry.slug === "liquid-tabs" && <LiquidTabs theme={theme} />}
          {entry.slug === "thermal-dial" && <ThermalDial theme={theme} />}
          {entry.slug === "lamp-switch" && <LampSwitch theme={theme} />}
          {entry.slug === "chat-room" && <ChatRoom theme={theme} sound={sound} />}
          {entry.slug === "dynamic-drop-zone" && <DynamicDropZone theme={theme} />}
          {entry.slug === "swap-card" && <SwapCard theme={theme} />}
          {entry.slug === "calendar-card" && <CalendarCard theme={theme} />}
          {entry.slug === "prompt-composer" && <PromptComposer theme={theme} />}
          {entry.slug === "progress-image" && <ProgressImage theme={theme} />}
          {entry.slug === "magnify" && <Magnify theme={theme} />}
          {entry.slug === "file-box" && <FileBox theme={theme} fill />}
          {entry.slug === "liquid-voice" && <LiquidVoice theme={theme} fill />}
          {entry.slug === "task-card" && <TaskCard theme={theme} />}
          {/* ⌘V on the pad pastes the copied theme into the site's own switch */}
          {entry.slug === "copy-paste-pad" && (
            <CopyPastePad
              fill
              theme={theme}
              sound={sound}
              onThemeChange={(next) => setSiteTheme(next === "dark" ? "crimson" : "light")}
            />
          )}
        </div>

        {entry.slug === "chips" && <ChipsEditor value={chips} onChange={setChips} />}

        {entry.requestedBy && <RequestChip handle={entry.requestedBy.handle} url={entry.requestedBy.url} />}

        <StageBar
          items={[
            {
              id: "about",
              kind: "panel",
              pressed: about,
              label: about ? "Close the write-up" : "Read about this component",
              onClick: () => setAbout((on) => !on),
              iconKey: about ? "open" : "closed",
              icon: about ? (
                /* lucide: maximize — the stage grows back */
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.5 6.667V5a1.667 1.667 0 0 1 1.667-1.667h2.5M13.333 3.333h2.5A1.667 1.667 0 0 1 17.5 5v1.667M17.5 13.333V15a1.667 1.667 0 0 1-1.667 1.667h-2.5M6.667 16.667h-2.5A1.667 1.667 0 0 1 2.5 15v-1.667" />
                </svg>
              ) : (
                /* lucide: minimize — the stage shrinks for the write-up */
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6.667 2.5V5A1.667 1.667 0 0 1 5 6.667H2.5M17.5 6.667H15A1.667 1.667 0 0 1 13.333 5V2.5M2.5 13.333H5A1.667 1.667 0 0 1 6.667 15v2.5M13.333 17.5V15A1.667 1.667 0 0 1 15 13.333h2.5" />
                </svg>
              ),
            },
            {
              id: "code",
              kind: "panel",
              pressed: showCode,
              label: showCode ? "Hide the code" : "Show the code",
              onClick: () => setShowCode((on) => !on),
              iconKey: "code",
              icon: (
                /* lucide: code-xml */
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 13.333 18.333 10 15 6.667M5 6.667 1.667 10 5 13.333M12.083 3.333 7.917 16.667" />
                </svg>
              ),
            },
            /* only a component that makes sound gets a speaker */
            ...(entry.sound
              ? [
                  {
                    id: "sound",
                    kind: "toggle" as const,
                    divided: true,
                    pressed: sound,
                    label: sound ? "Mute the sound" : "Turn the sound on",
                    onClick: () => setSound((on) => !on),
                    iconKey: sound ? "on" : "off",
                    icon: (
                      /* lucide: volume-2 / volume-x */
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9.167 4.167 5.417 7.5H2.5v5h2.917l3.75 3.333V4.167z" />
                        {sound ? (
                          <path d="M12.917 7.083a3.75 3.75 0 0 1 0 5.834M15.25 5a7.5 7.5 0 0 1 0 10" />
                        ) : (
                          <path d="m13.333 7.917 3.75 4.166M17.083 7.917l-3.75 4.166" />
                        )}
                      </svg>
                    ),
                  },
                ]
              : []),
          ]}
        />
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
              <h2 className="wbinfo__name">
                {entry.name}
                {entry.isNew && <span className="wbinfo__new">New</span>}
              </h2>
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
              {/*
                An original has no pin to credit: its maker is credited by the
                dot beside its name instead, so the Pinterest line is left out.
              */}
              {!entry.creator && (
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
                  {entry.info.credit && (
                    <>
                      ,{" "}
                      <a
                        className="wbinfo__link"
                        href={entry.info.credit.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {entry.info.credit.label}
                      </a>
                    </>
                  )}
                  .
                </p>
              )}
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
