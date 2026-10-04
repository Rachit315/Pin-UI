"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LayoutGroup, motion, type Transition } from "motion/react";
import "./chat-room.css";

/**
 * Chat Room — a stack of faces that morphs into a voice chat card.
 *
 * The pill and the card are one surface shared through a layout id, so a
 * click grows the card out of the pill's own centre: the faces on the pill fly
 * to their seats on the card, the hidden ones rise into the grid after them,
 * the live badge parks in the header corner and the "+3" travels in and
 * dissolves. Closing runs it backwards — the card's contents fade out first,
 * then the surface folds back into the pill. One spring drives every piece, so
 * they all land together. Each step has a soft synthesised sound.
 */

export type ChatRoomPerson = {
  id: string;
  name: string;
  /** Portrait URL. */
  src: string;
  /** Shows the little equaliser on their face. */
  speaking?: boolean;
};

export type ChatRoomProps = {
  /** The open card's corner radius, 0–40px. */
  corner?: number;
  /** How many faces the closed pill shows. */
  rows?: 2 | 3 | 4;
  /** Who is in the room. Up to eight sit on the card's grid. */
  people?: ChatRoomPerson[];
  theme?: "light" | "dark";
  /** The opening pop, the closing pop and the join and leave chimes. */
  sound?: boolean;
  /** Fired when the join button is pressed, with whether you are now in. */
  onJoinChange?: (joined: boolean) => void;
};

const AVATARS = "/library/voice";

export const CHAT_ROOM_PEOPLE: ChatRoomPerson[] = [
  { id: "oguz", name: "Oğuz", src: `${AVATARS}/oguz.webp`, speaking: true },
  { id: "ashish", name: "Ashish", src: `${AVATARS}/ashish.webp` },
  { id: "mariana", name: "Mariana", src: `${AVATARS}/mariana.webp` },
  { id: "mds", name: "MDS", src: `${AVATARS}/mds.webp` },
  { id: "ana", name: "Ana", src: `${AVATARS}/ana.webp` },
  { id: "natko", name: "Natko", src: `${AVATARS}/natko.webp`, speaking: true },
  { id: "afshin", name: "Afshin", src: `${AVATARS}/afshin.webp` },
];

/* one spring drives the whole morph so every piece lands together */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const fade = (delay = 0): Transition => ({ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay });

const CONTENT_OUT_MS = 120;
const out: Transition = { duration: CONTENT_OUT_MS / 1000, ease: [0.4, 0, 1, 1] };

const CARD_W = 300;
const STAGE_H = 312;
const PILL_RADIUS = 32;

export default function ChatRoom({
  corner = 20,
  rows = 4,
  people = CHAT_ROOM_PEOPLE,
  theme = "light",
  sound = true,
  onJoinChange,
}: ChatRoomProps) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  /* closing: the card's contents fade out first, then the surface morphs back */
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const group = useId();

  /* read at play time, so a sound already scheduled respects a fresh mute */
  const soundOn = useRef(sound);
  soundOn.current = sound;
  const play = (cue: keyof typeof cues) => {
    if (soundOn.current) cues[cue]();
  };

  const roster = people.slice(0, 8);
  const visible = Math.min(roster.length, Math.max(2, Math.min(4, Number(rows) || 4)));
  const hidden = roster.length - visible;
  const radius = Math.min(40, Math.max(0, corner));

  const closeTimer = useRef<number | undefined>(undefined);
  const close = (returnFocus: boolean) => {
    if (closeTimer.current) return;
    play("close");
    refocus.current = returnFocus;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      setClosing(false);
      setOpen(false);
    }, CONTENT_OUT_MS);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openCard = () => {
    play("open");
    setOpen(true);
  };

  /* hand focus back to the pill after a keyboard / close-button dismissal */
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      pillRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  /*
   * Escape or a press outside closes it. Page chrome marked data-keep-open
   * (a theme switch, a sound toggle) doesn't count as outside.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (rootRef.current?.contains(target) || target.closest?.("[data-keep-open]")) return;
      close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="pvc" data-theme={theme}>
      <LayoutGroup id={`pvc-${group}`}>
        {/*
          A fixed stage: both states are centred in the same box, so the morph
          grows out of the pill's centre and never shifts what is around it.
        */}
        <div ref={rootRef} className="pvc__stage" style={{ width: CARD_W, height: STAGE_H }}>
          {open ? (
            <motion.div
              key="card"
              layoutId="shell"
              transition={morph}
              role="dialog"
              aria-label="Voice Chat"
              className="pvc__card"
              style={{ width: CARD_W, borderRadius: radius }}
            >
              {/* the live badge parks in the header corner and fades out */}
              <motion.div
                layoutId="badge"
                transition={morph}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0.5, transition: { ...morph, opacity: fade() } }}
                className="pvc__badge pvc__badge--card"
                style={{ borderRadius: 999 }}
              >
                <Bars size="lg" />
              </motion.div>

              {/* "+3" travels into the card and dissolves */}
              {hidden > 0 && (
                <motion.span
                  layoutId="more"
                  transition={morph}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0, transition: { ...morph, opacity: fade() } }}
                  className="pvc__more pvc__more--card"
                >
                  +{hidden}
                  <Chevron />
                </motion.span>
              )}

              <motion.header
                layout="position"
                transition={morph}
                initial={{ opacity: 0, y: -4 }}
                animate={
                  closing
                    ? { opacity: 0, y: -4, transition: out }
                    : { opacity: 1, y: 0, transition: { ...morph, opacity: fade(0.08) } }
                }
                className="pvc__head"
              >
                <span className="pvc__title">Voice Chat</span>
                <motion.button
                  type="button"
                  aria-label="Close"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => close(true)}
                  className="pvc__close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.header>

              <ul className="pvc__grid">
                {roster.map((p, i) => (
                  <CardMember key={p.id} person={p} index={i} extra={i >= visible} order={i - visible} closing={closing} />
                ))}
              </ul>

              <motion.footer
                layout="position"
                transition={morph}
                initial={{ opacity: 0, y: 10 }}
                animate={
                  closing
                    ? { opacity: 0, y: 8, transition: out }
                    : { opacity: 1, y: 0, transition: { ...morph, delay: 0.04, opacity: fade(0.12) } }
                }
                className="pvc__foot"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    play(joined ? "leave" : "join");
                    setJoined(!joined);
                    onJoinChange?.(!joined);
                  }}
                  className="pvc__join"
                >
                  <Swap key={joined ? "leave" : "join"} distance={14}>
                    {joined ? "Leave Chat" : "Join Now"}
                  </Swap>
                </motion.button>
                <div className="pvc__note">
                  <Swap key={joined ? "joined" : "idle"} distance={10}>
                    {joined ? "You're in. Your mic is muted." : "Mic will be muted initially."}
                  </Swap>
                </div>
              </motion.footer>
            </motion.div>
          ) : (
            <motion.div
              key="pill"
              ref={pillRef}
              layoutId="shell"
              transition={morph}
              role="button"
              tabIndex={0}
              aria-label={`Open voice chat, ${roster.length} people`}
              aria-expanded={false}
              onClick={openCard}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openCard();
                }
              }}
              className="pvc__pill"
              style={{ borderRadius: PILL_RADIUS }}
            >
              <motion.div
                layoutId="badge"
                transition={morph}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1, transition: { ...morph, opacity: fade(0.1) } }}
                className="pvc__badge pvc__badge--pill"
                style={{ borderRadius: 999 }}
              >
                <Bars size="lg" />
              </motion.div>

              {roster.slice(0, visible).map((p, i) => (
                <motion.div
                  key={p.id}
                  layoutId={`avatar-${p.id}`}
                  transition={morph}
                  className={i === 0 ? "pvc__seat" : "pvc__seat pvc__seat--overlap"}
                  style={{ zIndex: 10 - i, borderRadius: 999 }}
                >
                  <Avatar person={p} />
                </motion.div>
              ))}

              {hidden > 0 && (
                <motion.span
                  layoutId="more"
                  transition={morph}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { ...morph, opacity: fade(0.14) } }}
                  className="pvc__more pvc__more--pill"
                >
                  +{hidden}
                  <Chevron />
                </motion.span>
              )}
            </motion.div>
          )}
        </div>
      </LayoutGroup>
    </div>
  );
}

function CardMember({
  person,
  index,
  extra,
  order,
  closing,
}: {
  person: ChatRoomPerson;
  index: number;
  extra: boolean;
  order: number;
  closing: boolean;
}) {
  return (
    <li className="pvc__member">
      <motion.div
        layoutId={`avatar-${person.id}`}
        transition={extra ? { ...morph, delay: 0.06 + order * 0.04 } : morph}
        initial={extra ? { opacity: 0, scale: 0.6, y: 10 } : false}
        animate={closing && extra ? { opacity: 0, scale: 0.7, y: 6, transition: out } : { opacity: 1, scale: 1, y: 0 }}
        className="pvc__seat"
        style={{ borderRadius: 999 }}
      >
        <motion.div whileHover={{ y: -2 }} transition={morph}>
          <Avatar person={person} />
        </motion.div>
        {person.speaking && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={
              closing
                ? { opacity: 0, scale: 0.4, transition: out }
                : { opacity: 1, scale: 1, transition: { ...morph, delay: 0.16 } }
            }
            className="pvc__speaking"
          >
            <Bars size="sm" />
          </motion.span>
        )}
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: -3 }}
        animate={
          closing
            ? { opacity: 0, transition: out }
            : { opacity: 1, y: 0, transition: { ...morph, delay: 0.1, opacity: fade(0.1 + index * 0.015) } }
        }
        className="pvc__name"
      >
        {person.name}
      </motion.span>
    </li>
  );
}

function Avatar({ person }: { person: ChatRoomPerson }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="pvc__avatar" src={person.src} alt={person.name} width={46} height={46} draggable={false} decoding="async" />
  );
}

/* lucide: chevron-down */
function Chevron() {
  return (
    <svg className="pvc__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* text that rolls up when it changes; give it a new key to trigger the roll */
function Swap({ distance, children }: { distance: number; children: string }) {
  return (
    <motion.span initial={{ opacity: 0, y: distance }} animate={{ opacity: 1, y: 0 }} transition={morph} className="pvc__swap">
      {children}
    </motion.span>
  );
}

/*
 * The equaliser on the speaking faces and the live badge — transform only, so
 * the bars run on the compositor and never touch layout.
 */
const barPattern = [
  { h: [0.35, 1, 0.5, 0.8, 0.35], d: 1.1 },
  { h: [0.7, 0.3, 1, 0.45, 0.7], d: 0.9 },
  { h: [0.5, 0.9, 0.3, 1, 0.5], d: 1.25 },
  { h: [0.9, 0.45, 0.75, 0.3, 0.9], d: 1.0 },
];

function Bars({ size }: { size: "sm" | "lg" }) {
  return (
    <span className={`pvc__bars pvc__bars--${size}`} aria-hidden="true">
      {barPattern.map((b, i) => (
        <motion.span
          key={i}
          className="pvc__bar"
          style={{ originY: 0.5 }}
          animate={{ scaleY: b.h }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/* ── sound: synthesised with Web Audio, no files ─────────────────────────── */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    /* a gentle compressor so stacked tones never clip */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    /* one shared buffer of white noise for every swish */
    const len = Math.ceil(ctx.sampleRate * 0.3);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  /* browsers start the context suspended until a gesture */
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { from: number; to?: number; at?: number; dur: number; gain: number; type?: OscillatorType; attack?: number };

function tone(ac: AudioContext, { from, to = from, at = 0, dur, gain, type = "sine", attack = 0.006 }: Tone) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* a short band-passed noise swish — the air moving as the card morphs */
function swish(ac: AudioContext, { from, to, dur, gain }: { from: number; to: number; dur: number; gain: number }) {
  if (!noise) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band).connect(env).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const cues = {
  /* pill → card: a rising glassy pop with a sparkle on top */
  open() {
    const ac = audio();
    if (!ac) return;
    swish(ac, { from: 900, to: 3200, dur: 0.22, gain: 0.05 });
    tone(ac, { from: 420, to: 760, dur: 0.16, gain: 0.32 });
    tone(ac, { from: 1520, at: 0.05, dur: 0.18, gain: 0.06 });
  },
  /* card → pill: the same gesture played backwards, slightly lower */
  close() {
    const ac = audio();
    if (!ac) return;
    swish(ac, { from: 2600, to: 700, dur: 0.2, gain: 0.04 });
    tone(ac, { from: 700, to: 360, dur: 0.15, gain: 0.3 });
    tone(ac, { from: 160, to: 110, dur: 0.12, gain: 0.12 });
  },
  /* joined: two bright notes up a fifth, like a channel join */
  join() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 587.33, dur: 0.32, gain: 0.22, type: "triangle" });
    tone(ac, { from: 1174.66, dur: 0.22, gain: 0.04 });
    tone(ac, { from: 880, at: 0.09, dur: 0.42, gain: 0.24, type: "triangle" });
    tone(ac, { from: 1760, at: 0.09, dur: 0.3, gain: 0.05 });
  },
  /* left: the chime mirrored downward */
  leave() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { from: 880, dur: 0.28, gain: 0.2, type: "triangle" });
    tone(ac, { from: 587.33, at: 0.09, dur: 0.38, gain: 0.22, type: "triangle" });
  },
};
