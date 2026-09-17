/**
 * Pin UI's voice.
 *
 * Every sound here is a *struck string*, not a tone. A buffer one period long
 * is filled with noise and then repeatedly averaged with itself through a
 * one-pole lowpass: the noise reorganises into a pitch, and each pass loses a
 * little of its top end, so the note starts bright and darkens as it rings, the
 * way a real plucked body behaves. It is Karplus-Strong, and it is why these do
 * not sound like the sine blips and clicks every other site ships. The timbre
 * falls out of a physical model rather than an oscillator with an envelope
 * stuck on it.
 *
 * Three things here were arrived at by measuring rather than by theory:
 *
 *  - The string is run in plain JavaScript straight into an AudioBuffer rather
 *    than wired as a DelayNode feedback loop. Web Audio clamps a delay inside a
 *    cycle to a minimum of one render quantum, which at these pitches is longer
 *    than the period itself: a requested 587Hz came out at 216Hz, and a 1760Hz
 *    shimmer landed below its own root.
 *  - The excitation is smoothed before it is used. Raw noise peaks some 14x
 *    above the note it settles into, which reads as a click rather than a
 *    pluck.
 *  - The damping filter is solved for, not dialled in. Its loss compounds once
 *    per period, so a fixed cutoff that suits a low note annihilates a high one
 *    a few octaves up, where there are several thousand more passes to get
 *    through.
 *
 * Nothing is sampled, so there are no bytes to download, nothing to 404, and no
 * decode before the first play.
 */

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let muted = false;

/** Rendered strings, keyed by their recipe. Each one is built at most once. */
const strings = new Map<string, AudioBuffer>();

function engine(): { ctx: AudioContext; bus: GainNode } | null {
  if (typeof window === "undefined" || muted) return null;

  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;

      ctx = new Ctor();

      bus = ctx.createGain();
      bus.gain.value = 0.9;

      /* a struck string carries energy well below its fundamental; it reads as
         mud on laptop speakers, so it never leaves the bus */
      const trim = ctx.createBiquadFilter();
      trim.type = "highpass";
      trim.frequency.value = 120;

      bus.connect(trim).connect(ctx.destination);
    }

    /* Safari keeps the context suspended until a gesture resumes it */
    if (ctx.state === "suspended") void ctx.resume();
    return { ctx, bus: bus as GainNode };
  } catch {
    /* audio is a nicety, so never let it take the interaction down with it */
    muted = true;
    return null;
  }
}

/**
 * Open the context while a real gesture is still in hand.
 *
 * Safari only counts user activation for a moment, so a sound played after an
 * await can be refused outright. Calling this synchronously inside the handler
 * that started the work means the context is already running by the time the
 * sound is due.
 */
export function primeSound() {
  engine();
}

type Recipe = {
  /** Pitch in hertz. The period sets the length of the string. */
  freq: number;
  /** Seconds to fall 60dB. */
  decay: number;
  /**
   * How much of the note's decay comes from losing its top end rather than
   * simply getting quieter, in dB. More of it is a softer, woodier strike; less
   * is closer to struck glass. It is a share of the whole decay, so it means
   * the same thing at every pitch.
   */
  darken: number;
};

/** A one-pole lowpass's magnitude at angular frequency `w`. */
function poleGain(a: number, w: number) {
  return (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(w) + a * a);
}

/**
 * Find the filter coefficient that loses exactly `target` per pass at the
 * fundamental. The magnitude falls monotonically as `a` rises, so a bisection
 * settles it in a few dozen steps — and it runs once per distinct note, not
 * once per play.
 */
function solvePole(w: number, target: number) {
  let low = 0;
  let high = 0.9999;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (poleGain(mid, w) > target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Run the string, building it the first time it is asked for. */
function string(audio: AudioContext, { freq, decay, darken }: Recipe) {
  const key = `${Math.round(audio.sampleRate)}:${freq}:${decay}:${darken}`;
  const cached = strings.get(key);
  if (cached) return cached;

  const rate = audio.sampleRate;
  const period = Math.max(2, Math.round(rate / freq));
  const total = Math.ceil(rate * (decay + 0.08));

  /* every slot is rewritten once per period, so this is how many times the
     note passes through the filter before it is done */
  const passes = Math.max(1, freq * decay);
  const w = (2 * Math.PI * freq) / rate;

  /* split the decay between the filter and a flat loss, so `darken` reads the
     same at every pitch and the note still lands 60dB down at `decay` */
  const a = solvePole(w, Math.pow(10, darken / (20 * passes)));
  const loss = Math.pow(10, (-60 - darken) / (20 * passes));

  /* the pluck: one period of noise, smoothed so the attack is a strike rather
     than a spike, and tapered so it has no hard edge */
  const line = new Float32Array(period);
  let smoothed = 0;
  for (let i = 0; i < period; i += 1) {
    const noise = (Math.random() * 2 - 1) * (1 - (i / period) * 0.35);
    smoothed = 0.2 * noise + 0.8 * smoothed;
    line[i] = smoothed;
  }

  const out = new Float32Array(total);
  let low = 0;
  let peak = 0;

  for (let i = 0; i < total; i += 1) {
    const slot = i % period;
    const sample = line[slot];
    out[i] = sample;

    low = (1 - a) * sample + a * low;
    line[slot] = low * loss;

    const size = sample < 0 ? -sample : sample;
    if (size > peak) peak = size;
  }

  /* normalise so `level` at the call site means the same thing for every note,
     and fade the last 60ms so the buffer cannot end on a click */
  const scale = peak > 0 ? 0.98 / peak : 1;
  const fade = Math.min(Math.floor(rate * 0.06), total);
  for (let i = 0; i < total; i += 1) {
    const taper = i >= total - fade ? (total - i) / fade : 1;
    out[i] *= scale * taper;
  }

  const buffer = audio.createBuffer(1, total, rate);
  buffer.copyToChannel(out, 0);
  strings.set(key, buffer);
  return buffer;
}

/** Strike one note. */
function pluck(
  audio: AudioContext,
  out: AudioNode,
  recipe: Recipe & { at?: number; level?: number },
) {
  const { at = 0, level = 0.5 } = recipe;

  const source = audio.createBufferSource();
  source.buffer = string(audio, recipe);

  const gain = audio.createGain();
  gain.gain.value = level;

  source.connect(gain).connect(out);
  source.start(audio.currentTime + at);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}

/** A low sine that sags a little: the weight under a strike, not a note. */
function body(
  audio: AudioContext,
  out: AudioNode,
  {
    freq,
    at = 0,
    level = 0.2,
    length = 0.2,
  }: { freq: number; at?: number; level?: number; length?: number },
) {
  const when = audio.currentTime + at;

  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.8, when + length);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(level, when + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);

  osc.connect(gain).connect(out);
  osc.start(when);
  osc.stop(when + length + 0.03);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * A clip coming up: one bright strike with its octave a breath behind, so the
 * note opens outward rather than merely sounding.
 */
export function playOpen() {
  const e = engine();
  if (!e) return;

  pluck(e.ctx, e.bus, { freq: 587.33, level: 0.38, decay: 0.7, darken: -10 });
  pluck(e.ctx, e.bus, {
    freq: 1174.66,
    at: 0.04,
    level: 0.12,
    decay: 0.45,
    darken: -8,
  });
}

/** A clip going back down: the same voice, lower, darker and shorter. */
export function playClose() {
  const e = engine();
  if (!e) return;

  pluck(e.ctx, e.bus, { freq: 392, level: 0.32, decay: 0.4, darken: -8 });
}

/**
 * The join. A pass being stamped, then confirmed.
 *
 * A low body lands first and gives the moment its weight. Three strikes then
 * climb the root, fifth and octave of D, an open interval that reads as settled
 * rather than merely cheerful, and a quiet strike two octaves above rings on
 * over the top of them as the shimmer. It is not a jingle: it is one chord
 * arriving in order, which is what makes it sound earned rather than awarded.
 */
export function playConfirm() {
  const e = engine();
  if (!e) return;

  body(e.ctx, e.bus, { freq: 146.83, level: 0.24, length: 0.28 });

  pluck(e.ctx, e.bus, { freq: 293.66, level: 0.3, decay: 1.2, darken: -12 });
  pluck(e.ctx, e.bus, {
    freq: 440,
    at: 0.085,
    level: 0.26,
    decay: 1.5,
    darken: -12,
  });
  pluck(e.ctx, e.bus, {
    freq: 587.33,
    at: 0.17,
    level: 0.3,
    decay: 2.2,
    darken: -12,
  });

  /* the shimmer, quiet enough to be felt more than heard */
  pluck(e.ctx, e.bus, {
    freq: 1760,
    at: 0.21,
    level: 0.07,
    decay: 2.4,
    darken: -10,
  });
}
