"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import "./prompt-composer.css";

/**
 * Prompt Composer — an assistant's field with its quick actions fanned out
 * behind it.
 *
 * Five cards stand up behind the field, each leaning its own way: an image, a
 * note, an event, voice and documents. Hover one and it lifts and straightens
 * while its neighbours lean out of the way, and its little drawing comes to
 * life. Pick it and the fan sinks back behind the field while the action
 * arrives inside it as a chip, and the placeholder changes to suit.
 *
 * Voice — the card or the microphone — turns the field into a recorder: a red
 * dot and a running clock, and a waveform that scrolls in from the right as if
 * someone were talking. It is a demo, so nothing is listened to; stop it and a
 * sample transcript types itself into the field, ready to send. Send, and the
 * composer starts over: the field clears and the cards come up out of it again.
 *
 * One spring drives every morph, as in Bencho's SelectionList, so all the
 * pieces land together.
 */

export type PromptComposerProps = {
  theme?: "light" | "dark";
  /** Fired when a prompt is sent, with the text, the action picked (if any) and the model. */
  onSend?: (prompt: { text: string; action: ActionId | null; model: string }) => void;
};

export type ActionId = "image" | "note" | "event" | "voice" | "docs";

type Action = {
  id: ActionId;
  label: string;
  placeholder: string;
  /* the card's lean at rest, in degrees */
  tilt: number;
  /* how high it stands, in px: the middle card a touch prouder */
  rise: number;
  /* which card lies over which, where they overlap */
  layer: number;
};

const ACTIONS: Action[] = [
  { id: "image", label: "Create image", placeholder: "Describe the image you want…", tilt: -5, rise: 0, layer: 1 },
  { id: "note", label: "Add note", placeholder: "Write a note…", tilt: 2.5, rise: 3, layer: 2 },
  { id: "event", label: "Create event", placeholder: "What's the event, and when?", tilt: -2, rise: 6, layer: 4 },
  { id: "voice", label: "Voice mode", placeholder: "", tilt: 3, rise: 3, layer: 3 },
  { id: "docs", label: "Analyse docs", placeholder: "Drop a doc, or ask about one…", tilt: -4.5, rise: 0, layer: 4 },
];

const MODELS = [
  { name: "Quick 1.5", note: "Fast answers" },
  { name: "Deep 2.0", note: "Thinks it through" },
  { name: "Vision 1.2", note: "Sees your images" },
];

/* what the voice demo "heard" */
const TRANSCRIPT = "Remind me to send the design review notes to Sam at 5 pm";

/* the same motion vocabulary as Bencho's SelectionList: one spring for every morph */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const fade = (delay = 0): Transition => ({ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay });
const blurIn = { opacity: 0, filter: "blur(6px)" };
const blurOut = { opacity: 1, filter: "blur(0px)" };

/* where each card stands along the field, as a share of its width */
const CENTRES = [14.2, 32.1, 50, 67.9, 85.8];

type Mode = "idle" | "recording" | "transcribing";

export default function PromptComposer({ theme = "light", onSend }: PromptComposerProps) {
  const reduced = useReducedMotion();
  const group = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [action, setAction] = useState<ActionId | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [trayOpen, setTrayOpen] = useState(true);
  const [hovered, setHovered] = useState<ActionId | null>(null);
  const [model, setModel] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuHover, setMenuHover] = useState<number | null>(null);
  const [spins, setSpins] = useState(0);
  /* bumps on every send, so the fan starts over and rises out of the field again */
  const [round, setRound] = useState(0);

  const picked = action && action !== "voice" ? ACTIONS.find((a) => a.id === action)! : null;
  const fanUp = trayOpen && action === null && mode === "idle";
  const canSend = text.trim().length > 0 && mode === "idle";

  const focusField = () => inputRef.current?.focus({ preventScroll: true });

  /* the transcript types itself in, a character at a time */
  useEffect(() => {
    if (mode !== "transcribing") return;
    let i = 0;
    const t = setInterval(() => {
      i = reduced ? TRANSCRIPT.length : i + 1;
      setText(TRANSCRIPT.slice(0, i));
      if (i >= TRANSCRIPT.length) {
        clearInterval(t);
        setMode("idle");
        focusField();
      }
    }, 22);
    return () => clearInterval(t);
  }, [mode, reduced]);

  const pick = (id: ActionId) => {
    setHovered(null);
    setMenuOpen(false);
    if (id === "voice") {
      setAction(null);
      setText("");
      setMode("recording");
      return;
    }
    setAction(id);
    focusField();
  };

  const clearAction = () => {
    setAction(null);
    setTrayOpen(true);
    focusField();
  };

  const stopRecording = useCallback(() => setMode("transcribing"), []);
  const cancelRecording = () => {
    setMode("idle");
    setTrayOpen(true);
  };

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend?.({ text: text.trim(), action, model: MODELS[model].name });
    /* back to where it started: an empty field, and the cards up out of it */
    setText("");
    setAction(null);
    setTrayOpen(true);
    setHovered(null);
    setMenuOpen(false);
    setRound((n) => n + 1);
  };

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && action) {
      e.preventDefault();
      clearAction();
    } else if (e.key === "Backspace" && action && text === "") {
      clearAction();
    }
  };

  const recording = mode === "recording";

  return (
    <div className="pcmp" data-theme={theme}>
      <LayoutGroup id={`pcmp-${group}`}>
        <form className="pcmp__row" onSubmit={send}>
          <div className="pcmp__side">
            <ModelPill
              model={model}
              open={menuOpen}
              hover={menuHover}
              onToggle={() => setMenuOpen((o) => !o)}
              onClose={() => setMenuOpen(false)}
              onHover={setMenuHover}
              onPick={(i) => {
                setModel(i);
                setMenuOpen(false);
              }}
            />
          </div>

          <div className="pcmp__fieldWrap">
            <div className="pcmp__field">
              {/* the quick actions, fanned out behind the field */}
              <div className="pcmp__fan" key={round} onPointerLeave={() => setHovered(null)}>
                {ACTIONS.map((a, i) => {
                  const lifted = hovered === a.id;
                  const h = hovered ? ACTIONS.findIndex((x) => x.id === hovered) : -1;
                  /* neighbours lean away from the card being looked at */
                  const lean = h < 0 || h === i ? 0 : i < h ? -1 : 1;
                  const near = h >= 0 && Math.abs(h - i) === 1;
                  const sinking = a.id === action || (a.id === "voice" && recording);
                  return (
                    <motion.button
                      key={a.id}
                      type="button"
                      className={`pcmp__card pcmp__card--${a.id}`}
                      style={{ left: `calc(${CENTRES[i]}% - var(--pcmp-card-w) / 2)`, zIndex: lifted ? 10 : a.layer }}
                      aria-label={a.label}
                      tabIndex={fanUp ? 0 : -1}
                      aria-hidden={!fanUp}
                      onPointerEnter={(e) => e.pointerType === "mouse" && fanUp && setHovered(a.id)}
                      onFocus={() => fanUp && setHovered(a.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => fanUp && pick(a.id)}
                      /* below the field's middle the fan is clipped, so a card here is inside the field */
                      initial={reduced ? false : { y: "115%", rotate: 0, scale: 0.92 }}
                      animate={
                        fanUp
                          ? {
                              y: -a.rise + (lifted ? -16 : near ? -3 : 0),
                              x: lean * (near ? 10 : 4),
                              rotate: lifted ? a.tilt * 0.3 : a.tilt + lean * (near ? 1.5 : 0.5),
                              scale: lifted ? 1.05 : 1,
                              opacity: 1,
                            }
                          : { y: "115%", x: 0, rotate: 0, scale: 0.92, opacity: reduced ? 0 : 1 }
                      }
                      transition={{
                        ...morph,
                        /* rising, they come up one after another; sinking, the picked one goes last */
                        delay: reduced ? 0 : fanUp ? (hovered ? 0 : 0.05 + i * 0.045) : sinking ? 0.06 : 0,
                        opacity: fade(),
                      }}
                      whileTap={reduced || !fanUp ? undefined : { scale: 0.97, y: -10 - a.rise }}
                    >
                      <motion.span
                        className="pcmp__cardFace"
                        /* the documents card's dog-ear folds further back on hover */
                        initial={false}
                        animate={{ "--pcmp-peel": a.id === "docs" && lifted && !reduced ? 1.2 : 1 } as Record<string, number>}
                        transition={morph}
                      >
                        {(a.id === "note" || a.id === "event") && <span className="pcmp__band" />}
                        {a.id === "docs" && <span className="pcmp__peel" aria-hidden="true" />}
                        <span className="pcmp__label">{a.label}</span>
                        <span className="pcmp__artBox">
                          <CardArt id={a.id} live={lifted} />
                        </span>
                      </motion.span>
                    </motion.button>
                  );
                })}
              </div>

              {/* the field itself */}
              <div className="pcmp__bar" data-recording={recording || undefined}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {recording ? (
                    <motion.div
                      key="recorder"
                      className="pcmp__recorder"
                      initial={reduced ? { opacity: 0 } : { ...blurIn, y: 6 }}
                      animate={{ ...blurOut, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { ...blurIn, y: -6 }}
                      transition={{ ...morph, opacity: fade(), filter: fade() }}
                    >
                      <Recorder onCancel={cancelRecording} onStop={stopRecording} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="typer"
                      className="pcmp__typer"
                      initial={reduced ? { opacity: 0 } : { ...blurIn, y: 6 }}
                      animate={{ ...blurOut, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { ...blurIn, y: -6 }}
                      transition={{ ...morph, opacity: fade(), filter: fade() }}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {picked && (
                          <motion.button
                            key={picked.id}
                            type="button"
                            className={`pcmp__chip pcmp__chip--${picked.id}`}
                            onClick={clearAction}
                            aria-label={`${picked.label} — remove`}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -10, filter: "blur(6px)" }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, filter: "blur(6px)" }}
                            transition={{
                              ...morph,
                              delay: reduced ? 0 : 0.12,
                              opacity: fade(reduced ? 0 : 0.12),
                              filter: fade(reduced ? 0 : 0.12),
                            }}
                            whileTap={reduced ? undefined : { scale: 0.94 }}
                          >
                            <ChipIcon id={picked.id} />
                            <span>{picked.label}</span>
                            <svg className="pcmp__chipX" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="m3.5 3.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <motion.div className="pcmp__inputWrap" layout="position" transition={morph}>
                        <label htmlFor={inputId} className="pcmp__sr">
                          Message
                        </label>
                        <input
                          ref={inputRef}
                          id={inputId}
                          className="pcmp__input"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onKeyDown={onInputKey}
                          readOnly={mode === "transcribing"}
                          autoComplete="off"
                        />
                        {/* the placeholder, drawn so it can change through a blur */}
                        <AnimatePresence mode="popLayout" initial={false}>
                          {text === "" && (
                            <motion.span
                              key={picked?.placeholder ?? "Ask anything"}
                              className="pcmp__placeholder"
                              aria-hidden="true"
                              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8, filter: "blur(4px)" }}
                              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8, filter: "blur(4px)" }}
                              transition={{ ...morph, opacity: fade(), filter: fade() }}
                            >
                              {picked?.placeholder ?? "Ask anything"}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <div className="pcmp__tools">
                        <motion.button
                          type="button"
                          className="pcmp__tool"
                          aria-label={fanUp ? "Hide the quick actions" : "Show the quick actions"}
                          aria-expanded={fanUp}
                          disabled={mode !== "idle"}
                          onClick={() => {
                            setSpins((n) => n + 1);
                            if (action) clearAction();
                            else setTrayOpen((o) => !o);
                          }}
                          whileTap={reduced ? undefined : { scale: 0.86 }}
                          transition={morph}
                        >
                          <motion.svg
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            animate={{ rotate: spins * 90 }}
                            transition={morph}
                          >
                            <path d="M10 3.75v12.5M3.75 10h12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </motion.svg>
                        </motion.button>

                        <motion.button
                          type="button"
                          className="pcmp__tool"
                          aria-label="Voice mode"
                          disabled={mode !== "idle"}
                          onClick={() => pick("voice")}
                          whileTap={reduced ? undefined : { scale: 0.86 }}
                          transition={morph}
                        >
                          <MicGlyph />
                        </motion.button>

                        {/* send, inside the field: it fills once there is something to send */}
                        <motion.button
                          type="submit"
                          className="pcmp__send"
                          aria-label="Send"
                          disabled={!canSend}
                          data-ready={canSend || undefined}
                          whileTap={reduced || !canSend ? undefined : { scale: 0.88 }}
                          transition={morph}
                        >
                          <motion.svg
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            animate={canSend && !reduced ? { y: [0, -1.5, 0] } : { y: 0 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                          >
                            <path d="M8 12.75V3.5M4 7.5l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </form>
      </LayoutGroup>
    </div>
  );
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="2.75" width="6" height="9.5" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.6 9.5a5.4 5.4 0 0 0 10.8 0M10 15v2.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------- recorder -- */

const BARS = 44;
const STEP_MS = 75;

/*
 * The voice demo. Nothing is listened to: the levels come from a small
 * speech-like generator — syllables that swell and fall inside words, with
 * short pauses between them — pushed in at the right every 75ms so the
 * waveform scrolls left like a voice memo. The bars are written straight to
 * the DOM, so the clock is the only thing that re-renders.
 */
function Recorder({ onCancel, onStop }: { onCancel: () => void; onStop: () => void }) {
  const reduced = useReducedMotion();
  const barsRef = useRef<HTMLSpanElement[]>([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const levels = Array.from({ length: BARS }, () => 0.08);
    let syllable = 0;
    let word = 4 + Math.floor(Math.random() * 6);
    let pause = 0;
    const next = () => {
      if (pause > 0) {
        pause -= 1;
        return 0.06 + Math.random() * 0.05;
      }
      syllable += 1;
      if (syllable > word) {
        syllable = 0;
        word = 3 + Math.floor(Math.random() * 7);
        pause = 1 + Math.floor(Math.random() * 3);
        return 0.1;
      }
      /* a syllable's swell: louder in the middle of the word */
      const mid = 1 - Math.abs(syllable / word - 0.5) * 1.2;
      return Math.min(1, 0.25 + mid * 0.55 + Math.random() * 0.35);
    };
    const paint = () => {
      barsRef.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${levels[i].toFixed(3)})`;
      });
    };
    if (reduced) {
      for (let i = 0; i < BARS; i++) levels[i] = 0.15 + 0.5 * Math.abs(Math.sin(i * 0.7));
      paint();
      return;
    }
    const t = setInterval(() => {
      levels.shift();
      levels.push(next());
      paint();
    }, STEP_MS);
    paint();
    return () => clearInterval(t);
  }, [reduced]);

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <span className="pcmp__rec" aria-hidden="true">
        <motion.span
          className="pcmp__recDot"
          animate={reduced ? undefined : { opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="pcmp__recClock">{clock}</span>
      </span>
      <span className="pcmp__sr" role="status">
        Recording, demo only
      </span>
      <span className="pcmp__wave" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            className="pcmp__waveBar"
            ref={(el) => {
              if (el) barsRef.current[i] = el;
            }}
          />
        ))}
      </span>
      <div className="pcmp__tools">
        <motion.button
          type="button"
          className="pcmp__tool"
          aria-label="Cancel recording"
          onClick={onCancel}
          whileTap={reduced ? undefined : { scale: 0.86 }}
          transition={morph}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5.5 5.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          className="pcmp__stop"
          aria-label="Stop recording"
          onClick={onStop}
          whileTap={reduced ? undefined : { scale: 0.88 }}
          transition={morph}
        >
          {!reduced && (
            <motion.span
              className="pcmp__ring"
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity }}
            />
          )}
          <span className="pcmp__stopSquare" />
        </motion.button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ model pill -- */

/*
 * The model pill and its list. The list is a SelectionList in small: one grey
 * square shared through a layout id follows the pointer from row to row, and
 * the check sits on the model in use. The pill's name swaps through a blur and
 * the pill eases to the new name's width.
 */
function ModelPill({
  model,
  open,
  hover,
  onToggle,
  onClose,
  onHover,
  onPick,
}: {
  model: number;
  open: boolean;
  hover: number | null;
  onToggle: () => void;
  onClose: () => void;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  /* a press anywhere else, or Escape, closes the list */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  return (
    <div className="pcmp__model" ref={ref}>
      <motion.button
        type="button"
        className="pcmp__pill"
        layout
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
        whileTap={reduced ? undefined : { scale: 0.95 }}
        transition={morph}
      >
        <motion.svg
          className="pcmp__petals"
          layout="position"
          viewBox="0 0 16 16"
          aria-hidden="true"
          animate={{ rotate: model * 60 }}
          transition={morph}
        >
          {/* six round petals about a hollow centre */}
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx="8" cy="3.9" r="2.6" fill="currentColor" transform={`rotate(${i * 60} 8 8)`} />
          ))}
          <circle cx="8" cy="8" r="2" fill="var(--pcmp-pill)" />
        </motion.svg>
        <span className="pcmp__pillName">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={MODELS[model].name}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ ...morph, opacity: fade(), filter: fade() }}
            >
              {MODELS[model].name}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.svg
          className="pcmp__caret"
          layout="position"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={morph}
        >
          <path d="m2.5 4 2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            className="pcmp__menu"
            role="listbox"
            aria-label="Model"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4, filter: "blur(6px)" }}
            transition={{ ...morph, opacity: fade(), filter: fade() }}
            onPointerLeave={() => onHover(null)}
          >
            {MODELS.map((m, i) => (
              <motion.button
                key={m.name}
                type="button"
                role="option"
                aria-selected={i === model}
                className="pcmp__option"
                onPointerEnter={() => onHover(i)}
                onFocus={() => onHover(i)}
                onClick={() => onPick(i)}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...morph,
                  opacity: fade(reduced ? 0 : 0.03 + i * 0.03),
                  y: { ...morph, delay: reduced ? 0 : 0.03 + i * 0.03 },
                }}
              >
                {hover === i && <motion.span layoutId="pcmp-option-hover" className="pcmp__optionHover" transition={morph} />}
                <span className="pcmp__optionText">
                  <span className="pcmp__optionName">{m.name}</span>
                  <span className="pcmp__optionNote">{m.note}</span>
                </span>
                {i === model && (
                  <motion.svg
                    layoutId="pcmp-option-check"
                    className="pcmp__check"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                    transition={morph}
                  >
                    <path d="m3 7.4 2.6 2.6L11 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- card art -- */

/* each card's drawing, in the faint grey the reference draws them in; hovered, it comes to life */
function CardArt({ id, live }: { id: ActionId; live: boolean }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const go = live && !reduced;
  const spin = { transformBox: "fill-box" as const, transformOrigin: "center" };

  if (id === "image") {
    return (
      <svg className="pcmp__art" viewBox="0 0 80 64" fill="none" aria-hidden="true">
        <motion.path
          d="M52 4c1.3 7.4 3.6 9.7 11 11-7.4 1.3-9.7 3.6-11 11-1.3-7.4-3.6-9.7-11-11 7.4-1.3 9.7-3.6 11-11Z"
          fill="var(--pcmp-art-deep)"
          style={spin}
          animate={go ? { rotate: 90, scale: 1.2 } : { rotate: 0, scale: 1 }}
          transition={morph}
        />
        <motion.path
          d="M24 22 35 41H13Z"
          stroke="var(--pcmp-art)"
          strokeWidth="5"
          strokeLinejoin="round"
          style={spin}
          animate={go ? { rotate: -14, y: -2 } : { rotate: 0, y: 0 }}
          transition={morph}
        />
        <rect x="12" y="48" width="18" height="18" rx="4.5" stroke="var(--pcmp-art)" strokeWidth="5" />
        <motion.circle
          cx="52"
          cy="54"
          r="9"
          stroke="var(--pcmp-art)"
          strokeWidth="5"
          animate={go ? { y: -3 } : { y: 0 }}
          transition={{ ...morph, delay: go ? 0.04 : 0 }}
        />
      </svg>
    );
  }

  if (id === "note") {
    return (
      <span className="pcmp__lines" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="pcmp__line"
            animate={go ? { scaleX: [0.15, 1] } : { scaleX: 1 }}
            transition={go ? { duration: 0.5, ease: [0.2, 0, 0, 1], delay: i * 0.06 } : morph}
          />
        ))}
      </span>
    );
  }

  if (id === "event") {
    return (
      <motion.span className="pcmp__date" aria-hidden="true" animate={go ? { y: -3, scale: 1.06 } : { y: 0, scale: 1 }} transition={morph}>
        12
      </motion.span>
    );
  }

  if (id === "voice") {
    return (
      <svg className="pcmp__art" viewBox="0 0 80 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`pcmp-mic-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pcmp-art)" />
            <stop offset="1" stopColor="var(--pcmp-art-deep)" />
          </linearGradient>
        </defs>
        <path d="M18 34c0 13 9.5 22 22 22s22-9 22-22" stroke="var(--pcmp-art)" strokeWidth="5" strokeLinecap="round" />
        <motion.rect x="28" y="2" width="24" height="44" rx="12" fill={`url(#pcmp-mic-${uid})`} animate={go ? { y: -2 } : { y: 0 }} transition={morph} />
        <motion.g
          style={spin}
          animate={go ? { scale: [1, 1.14, 1] } : { scale: 1 }}
          transition={go ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : morph}
        >
          <circle cx="40" cy="46" r="11" fill="var(--pcmp-rec)" />
          <circle cx="40" cy="46" r="4" fill="var(--pcmp-rec-dot)" />
        </motion.g>
      </svg>
    );
  }

  return (
    <svg className="pcmp__art" viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <motion.g style={spin} animate={go ? { rotate: -4, y: -2 } : { rotate: 0, y: 0 }} transition={morph}>
        <rect x="16" y="4" width="48" height="60" rx="8" fill="var(--pcmp-art)" />
        <motion.rect
          x="31"
          y="24"
          width="24"
          height="5.5"
          rx="2.75"
          fill="var(--pcmp-card)"
          style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
          animate={go ? { scaleX: 1.15 } : { scaleX: 1 }}
          transition={morph}
        />
        <motion.rect
          x="31"
          y="36"
          width="24"
          height="5.5"
          rx="2.75"
          fill="var(--pcmp-card)"
          style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
          animate={go ? { scaleX: 0.7 } : { scaleX: 1 }}
          transition={morph}
        />
      </motion.g>
    </svg>
  );
}

function ChipIcon({ id }: { id: ActionId }) {
  const paths: Record<ActionId, ReactNode> = {
    image: <path d="M8 1.8c.6 3.3 1.6 4.3 4.9 4.9-3.3.6-4.3 1.6-4.9 4.9-.6-3.3-1.6-4.3-4.9-4.9 3.3-.6 4.3-1.6 4.9-4.9Z" fill="currentColor" />,
    note: (
      <>
        <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.2 6.5h5.6M5.2 9.5h3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
    event: (
      <>
        <rect x="2.5" y="3.2" width="11" height="10.3" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 6.6h11M5.5 1.8v2.6M10.5 1.8v2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
    voice: (
      <>
        <rect x="5.6" y="1.8" width="4.8" height="7.6" rx="2.4" fill="currentColor" />
        <path d="M3.6 7.6a4.4 4.4 0 0 0 8.8 0M8 12v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
    docs: (
      <>
        <path
          d="M4 1.9h5.2L12.6 5.3v7.6a1.3 1.3 0 0 1-1.3 1.3H4a1.3 1.3 0 0 1-1.3-1.3V3.2A1.3 1.3 0 0 1 4 1.9Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M5.4 8.5h4.6M5.4 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg className="pcmp__chipIcon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {paths[id]}
    </svg>
  );
}
