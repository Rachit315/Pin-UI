"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { animate, press, stagger, useReducedMotion } from "motion/react";
import "./cart-card.css";

/* ------------------------------------------------------------------ props -- */

export type CartCardProps = {
  /** Product name. It is clipped to one line, so anything fits. */
  title?: string;
  /** The line under the title. */
  brand?: string;
  /** Unit price. The figure on the card rolls to `price × quantity`. */
  price?: number;
  /** Product photo. It is multiplied onto the tile, so a white backdrop melts away. */
  image?: string;
  /** Synthesised cues for every interaction. */
  sound?: boolean;
  /** Fired once the slider is taken all the way across. */
  onConfirm?: (order: { quantity: number; total: number }) => void;
};

const OPEN = { type: "spring", stiffness: 240, damping: 28, mass: 0.9 } as const;
const SHUT = { type: "spring", stiffness: 330, damping: 34, mass: 0.8 } as const;
const SNAP = { type: "spring", stiffness: 620, damping: 18, mass: 0.6 } as const;
const TAP = { type: "spring", stiffness: 900, damping: 32 } as const;
const EASE = [0.16, 1, 0.3, 1] as const;

const INSET = 4;
const KNOB = 46;
/** C major pentatonic — any two of these land well together. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

/* ------------------------------------------------------------------ sound -- */

/**
 * Short envelopes over a pentatonic set: enough to be felt rather than heard.
 * Nothing ships as an asset and the context is only built once a gesture has
 * unlocked it.
 */
function useSfx(enabled: boolean) {
  const ref = useRef<{ ctx: AudioContext; master: AudioNode } | null>(null);
  const on = useRef(enabled);
  on.current = enabled;

  const wake = useCallback(() => {
    if (!on.current || typeof window === "undefined") return null;
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ref.current) {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.85;
      /* shaves the glassy top off every cue */
      const warm = ctx.createBiquadFilter();
      warm.type = "lowpass";
      warm.frequency.value = 5200;
      master.connect(warm).connect(ctx.destination);
      ref.current = { ctx, master };
    }
    if (ref.current.ctx.state === "suspended") void ref.current.ctx.resume();
    return ref.current;
  }, []);

  useEffect(() => () => void ref.current?.ctx.close().catch(() => {}), []);

  return useRef({
    /** one pitched voice, optionally gliding from `freq` to `to` */
    tone(o: { freq: number; to?: number; dur?: number; type?: OscillatorType; vol?: number; delay?: number }) {
      const engine = wake();
      if (!engine) return;
      const dur = o.dur ?? 0.18;
      const t = engine.ctx.currentTime + (o.delay ?? 0);
      const osc = engine.ctx.createOscillator();
      const gain = engine.ctx.createGain();
      osc.type = o.type ?? "sine";
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.vol ?? 0.12, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(engine.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },
    /** a filtered noise burst — the physical half of a tap or a pop */
    hit(o: { dur?: number; vol?: number; freq?: number; q?: number; delay?: number } = {}) {
      const engine = wake();
      if (!engine) return;
      const dur = o.dur ?? 0.1;
      const n = Math.max(1, Math.floor(engine.ctx.sampleRate * dur));
      const buffer = engine.ctx.createBuffer(1, n, engine.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < n; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
      const src = engine.ctx.createBufferSource();
      src.buffer = buffer;
      const band = engine.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = o.freq ?? 1200;
      band.Q.value = o.q ?? 1.2;
      const gain = engine.ctx.createGain();
      gain.gain.value = o.vol ?? 0.06;
      src.connect(band).connect(gain).connect(engine.master);
      src.start(engine.ctx.currentTime + (o.delay ?? 0));
    },
    wake,
  }).current;
}

/* -------------------------------------------------------------- component -- */

/**
 * A product card that is only a photo until you open it.
 *
 * Both growing regions — the detail body and the confirmation strip — are
 * measured at their natural height and then sprung to it, so neither can be
 * outgrown by its own content. The knob's transform is owned by the drag
 * rather than by a spring, so the pointer is tracked exactly and nothing ever
 * fights over the same property.
 */
export default function CartCard({
  title = "Air Force 1 Low Supr…",
  brand = "Nike",
  price = 59,
  image = "/library/shoe.jpg",
  sound = true,
  onConfirm,
}: CartCardProps) {
  const reduced = useReducedMotion();
  const sfx = useSfx(sound && !reduced);
  const gooId = useId().replace(/:/g, "");

  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const shoeRef = useRef<HTMLImageElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);
  const heartIconRef = useRef<SVGSVGElement>(null);
  const sparksRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const bodyInnerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const doneInnerRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLButtonElement>(null);
  const bagPlusRef = useRef<SVGGElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);

  /* the order, kept out of React state: every one of these is read inside
     pointer handlers that must not wait for a re-render to see the new value */
  const countRef = useRef(0);
  const openRef = useRef(false);
  const confirmedRef = useRef(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chainTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* slider geometry and drag bookkeeping */
  const travel = useRef(0);
  const offset = useRef(0);
  const knobScale = useRef(1);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const lastTick = useRef(0);

  /* --- mount: the shut card springs in ----------------------------------- */

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (reduced) {
      card.style.opacity = "1";
      if (shoeRef.current) shoeRef.current.style.opacity = "1";
      return;
    }
    animate(
      card,
      { opacity: [0, 1], y: [46, 0], scale: [0.94, 1] },
      { type: "spring", stiffness: 210, damping: 24, mass: 0.9 },
    );
    if (shoeRef.current) {
      animate(shoeRef.current, { opacity: [0, 1] }, { duration: 0.5, delay: 0.12, ease: EASE });
    }

    /*
     * A card mounted into a page that is not being rendered — a background tab,
     * a restored session, a throttled window — never gets the frames the
     * entrance is made of, and would sit at opacity 0 for as long as nobody
     * looked at it. The timer runs regardless of frames, so a second later the
     * card is simply in its finished state whether or not the entrance played.
     */
    const settle = setTimeout(() => {
      if (Number.parseFloat(getComputedStyle(card).opacity) > 0.99) return;
      card.getAnimations().forEach((a) => a.cancel());
      card.style.opacity = "1";
      card.style.transform = "none";
      if (shoeRef.current) shoeRef.current.style.opacity = "1";
    }, 1000);
    return () => clearTimeout(settle);
    // the entrance plays once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      clearTimeout(doneTimer.current);
      chainTimers.current.forEach(clearTimeout);
    },
    [],
  );

  /* --- the confirmation strip on the shut card --------------------------- */

  const hideDone = useCallback(() => {
    clearTimeout(doneTimer.current);
    const strip = doneRef.current;
    if (!strip) return;
    const h = strip.offsetHeight;
    if (h === 0) return;
    if (reduced) {
      strip.style.height = "0px";
      return;
    }
    animate(strip, { height: [`${h}px`, "0px"] }, SHUT);
    strip.dataset.to = "0";
    setTimeout(() => {
      if (strip.dataset.to !== "0") return;
      strip.getAnimations().forEach((a) => a.cancel());
      strip.style.height = "0px";
    }, 900);
  }, [reduced]);

  const showDone = useCallback(() => {
    clearTimeout(doneTimer.current);
    const strip = doneRef.current;
    const inner = doneInnerRef.current;
    if (!strip || !inner) return;

    /* the settled chime, once the card is small again */
    sfx.tone({ freq: SCALE[3], dur: 0.7, vol: 0.085 });
    sfx.tone({ freq: SCALE[5], dur: 0.9, vol: 0.06, delay: 0.06 });

    strip.style.height = "auto";
    const h = inner.offsetHeight;
    strip.style.height = "0px";

    if (reduced) {
      strip.style.height = `${h}px`;
    } else {
      animate(strip, { height: ["0px", `${h}px`] }, OPEN);
      animate(inner, { opacity: [0, 1], y: [10, 0] }, { ...OPEN, delay: 0.08 });
      /* the strip lands open on a timer too, for the same reason the fold does */
      strip.dataset.to = String(h);
      setTimeout(() => {
        if (strip.dataset.to !== String(h)) return;
        strip.getAnimations().forEach((a) => a.cancel());
        strip.style.height = `${h}px`;
        inner.style.opacity = "1";
        inner.style.transform = "none";
      }, 900);
    }
    doneTimer.current = setTimeout(hideDone, 3600);
  }, [hideDone, reduced, sfx]);

  /* --- open / shut -------------------------------------------------------- */

  const setCardOpen = useCallback(
    (next: boolean) => {
      if (openRef.current === next) return;
      openRef.current = next;
      setOpen(next);

      const box = bodyRef.current;
      const inner = bodyInnerRef.current;
      const card = cardRef.current;
      if (!box || !inner || !card) return;

      /* measure the natural height before the spring takes the property over */
      box.style.height = "auto";
      const full = inner.offsetHeight;
      const from = next ? 0 : full;
      const to = next ? full : 0;
      box.style.height = `${from}px`;

      if (reduced) {
        box.style.height = next ? "auto" : "0px";
      } else {
        void animate(box, { height: [`${from}px`, `${to}px`] }, next ? OPEN : SHUT).finished.then(() => {
          if (openRef.current === next) box.style.height = next ? "auto" : "0px";
        });
        /*
         * The spring writes the height frame by frame, and a page that is not
         * being rendered produces none — so the card would sit half open until
         * someone looked at it. This lands the final height on a timer, which
         * runs either way, and it is a no-op once the spring has got there.
         */
        chainTimers.current.push(
          setTimeout(() => {
            if (openRef.current !== next) return;
            box.getAnimations().forEach((a) => a.cancel());
            box.style.height = next ? "auto" : "0px";
          }, 900),
        );
      }

      if (next) {
        sfx.hit({ freq: 1500, vol: 0.045, dur: 0.07 });
        sfx.tone({ freq: 392, to: 784, dur: 0.24, type: "triangle", vol: 0.075 });
      } else {
        sfx.tone({ freq: 700, to: 320, dur: 0.2, type: "triangle", vol: 0.065 });
        sfx.hit({ freq: 700, vol: 0.035, dur: 0.09, delay: 0.1 });
      }

      if (next) {
        hideDone();
        const rows = Array.from(inner.querySelectorAll<HTMLElement>("[data-stagger]"));
        if (!reduced && rows.length) {
          rows.forEach((el) => {
            el.style.opacity = "0";
          });
          animate(rows, { opacity: [0, 1], y: [14, 0] }, { ...OPEN, delay: stagger(0.055, { startDelay: 0.06 }) });
        }
      }

      /* a small pop as it opens, and as it drops back down */
      if (!reduced) {
        animate(card, { scale: next ? [1, 1.015, 1] : [1, 0.985, 1] }, { duration: 0.42, ease: EASE });
      }
    },
    [hideDone, reduced, sfx],
  );

  /* --- the tile ----------------------------------------------------------- */

  useEffect(() => {
    const tile = tileRef.current;
    if (!tile || reduced) return;
    return press(tile, () => {
      animate(tile, { scale: 0.975 }, TAP);
      return () => animate(tile, { scale: 1 }, SNAP);
    });
  }, [reduced]);

  /* --- the heart ---------------------------------------------------------- */

  useEffect(() => {
    const heart = heartRef.current;
    if (!heart || reduced) return;
    return press(heart, () => {
      animate(heart, { scale: 0.86 }, TAP);
      return () => animate(heart, { scale: 1 }, SNAP);
    });
  }, [reduced]);

  function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);

    if (next) {
      sfx.tone({ freq: SCALE[2], dur: 0.11, vol: 0.13 });
      sfx.tone({ freq: SCALE[5], dur: 0.18, vol: 0.1, delay: 0.055 });
    } else {
      sfx.tone({ freq: 420, to: 262, dur: 0.14, vol: 0.08 });
    }

    if (reduced || !heartIconRef.current) return;
    animate(
      heartIconRef.current,
      next ? { scale: [1, 1.45, 1], rotate: [0, -12, 0] } : { scale: [1, 0.72, 1] },
      { duration: 0.5, ease: EASE },
    );

    if (!next || !sparksRef.current) return;
    const sparks = Array.from(sparksRef.current.children) as HTMLElement[];
    sparks.forEach((spark, i) => {
      const angle = (i / sparks.length) * Math.PI * 2;
      const distance = 24 + Math.random() * 10;
      animate(
        spark,
        {
          opacity: [1, 1, 0],
          scale: [0, 1, 0.2],
          x: [0, Math.cos(angle) * distance],
          y: [0, Math.sin(angle) * distance],
        },
        { duration: 0.62, delay: i * 0.012, ease: EASE },
      );
    });
  }

  /* --- the bag ------------------------------------------------------------ */

  useEffect(() => {
    const bag = bagRef.current;
    if (!bag || reduced) return;
    return press(bag, () => {
      animate(bag, { scale: 0.9 }, TAP);
      return () => animate(bag, { scale: 1 }, SNAP);
    });
  }, [reduced, open]);

  const setPrice = useCallback(
    (to: number) => {
      const el = priceRef.current;
      if (!el) return;
      const from = Number(el.textContent) || 0;
      if (reduced || from === to) {
        el.textContent = String(to);
        return;
      }
      animate(from, to, {
        duration: 0.45,
        ease: EASE,
        onUpdate: (v) => {
          el.textContent = String(Math.round(v));
        },
      });
      /* the final figure lands even if the roll was never drawn */
      setTimeout(() => {
        if (el.dataset.target === String(to)) el.textContent = String(to);
      }, 600);
      el.dataset.target = String(to);
    },
    [reduced],
  );

  function addToBag() {
    countRef.current += 1;
    const count = countRef.current;
    if (badgeRef.current) badgeRef.current.textContent = String(count);
    setPrice(price * count);

    /* the pitch climbs with the quantity, so the third tap sounds like a third */
    sfx.hit({ freq: 2000, vol: 0.05, dur: 0.06 });
    sfx.tone({ freq: SCALE[(count - 1) % SCALE.length], dur: 0.16, type: "triangle", vol: 0.11 });

    /* the badge being on is a resting state, so it is written rather than
       animated into place; the pop below is only dressing on top of it */
    if (badgeRef.current) badgeRef.current.style.opacity = "1";
    if (reduced) return;
    /* the plus turns a half circle and settles — quiet, but a beat */
    /* the plus turns a half circle and springs back out of the dip it takes */
    if (bagPlusRef.current) animate(bagPlusRef.current, { rotate: [0, 180], scale: [0.72, 1] }, { ...SNAP, stiffness: 420 });
    if (badgeRef.current) animate(badgeRef.current, { opacity: [0.4, 1], scale: [0.4, 1.3, 1] }, { duration: 0.5, ease: EASE });
  }

  /* --- slide to confirm ---------------------------------------------------- */

  /* the knob's transform is written here, so a drag tracks the pointer 1:1 and
     never fights a spring writing to the same property */
  const paint = useCallback((x: number) => {
    offset.current = x;
    if (knobRef.current) knobRef.current.style.transform = `translateX(${x}px) scale(${knobScale.current})`;
    const progress = travel.current > 0 ? x / travel.current : 0;
    if (fillRef.current) fillRef.current.style.width = `${x + KNOB + INSET}px`;
    sliderRef.current?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    if (confirmedRef.current) return;
    if (labelRef.current) {
      labelRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.6));
      labelRef.current.style.transform = `translateX(${progress * 14}px)`;
    }
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const measure = () => {
      travel.current = Math.max(0, slider.clientWidth - KNOB - INSET * 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slider);
    return () => observer.disconnect();
  }, [open]);

  const springTo = useCallback(
    (target: number, spec: Parameters<typeof animate>[2]) => {
      if (reduced) {
        paint(target);
        return;
      }
      animate(offset.current, target, { ...(spec as object), onUpdate: paint });
    },
    [paint, reduced],
  );

  const resetOrder = useCallback(() => {
    confirmedRef.current = false;
    if (labelRef.current) {
      labelRef.current.textContent = "Slide to confirm";
      labelRef.current.classList.remove("pcart__slideLabel--done");
      labelRef.current.style.opacity = "1";
      labelRef.current.style.transform = "none";
    }
    if (arrowRef.current) {
      arrowRef.current.style.opacity = "1";
      arrowRef.current.style.transform = "none";
    }
    if (checkRef.current) checkRef.current.style.opacity = "0";
    if (sliderRef.current) sliderRef.current.style.backgroundColor = "";
    knobScale.current = 1;
    paint(0);

    countRef.current = 0;
    if (badgeRef.current) {
      badgeRef.current.textContent = "0";
      badgeRef.current.style.opacity = "0";
    }
    if (priceRef.current) priceRef.current.textContent = String(price);
  }, [paint, price]);

  const confirmOrder = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    /* the reward: a rising triad with the octave on top */
    [0, 2, 3].forEach((step, i) => sfx.tone({ freq: SCALE[step], dur: 0.3, vol: 0.11, delay: i * 0.075 }));
    sfx.tone({ freq: SCALE[5], dur: 0.6, vol: 0.09, delay: 0.225 });
    sfx.hit({ freq: 3000, vol: 0.035, dur: 0.05 });

    springTo(travel.current, { type: "spring", stiffness: 300, damping: 28, mass: 0.7 });

    if (labelRef.current) {
      labelRef.current.textContent = "Order placed";
      labelRef.current.classList.add("pcart__slideLabel--done");
      labelRef.current.style.opacity = "0";
      if (!reduced) animate(labelRef.current, { opacity: [0, 1], y: [6, 0] }, { duration: 0.4, delay: 0.1, ease: EASE });
      else labelRef.current.style.opacity = "1";
    }
    if (!reduced) {
      if (arrowRef.current) animate(arrowRef.current, { opacity: 0, scale: 0.5 }, { duration: 0.18 });
      if (checkRef.current) animate(checkRef.current, { opacity: [0, 1], scale: [0.4, 1] }, { ...SNAP, delay: 0.12 });
      if (sliderRef.current) animate(sliderRef.current, { backgroundColor: "#1f3a24" }, { duration: 0.4 });
    } else {
      if (arrowRef.current) arrowRef.current.style.opacity = "0";
      if (checkRef.current) checkRef.current.style.opacity = "1";
    }

    onConfirm?.({ quantity: countRef.current, total: price * Math.max(1, countRef.current) });

    /* the confirmation lands on the shut card, not on this one */
    chainTimers.current.push(
      setTimeout(
        () => {
          setCardOpen(false);
          showDone();
          chainTimers.current.push(setTimeout(resetOrder, 520));
        },
        reduced ? 0 : 780,
      ),
    );
  }, [onConfirm, price, reduced, resetOrder, setCardOpen, sfx, showDone, springTo]);

  function onKnobDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (confirmedRef.current) return;
    dragging.current = true;
    startX.current = e.clientX;
    startOffset.current = offset.current;
    try {
      knobRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    lastTick.current = 0;
    sfx.hit({ freq: 900, vol: 0.04, dur: 0.05 });
    if (reduced) return;
    animate(knobScale.current, 1.06, {
      ...SNAP,
      onUpdate: (v) => {
        knobScale.current = v;
        paint(offset.current);
      },
    });
  }

  function onKnobMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const x = Math.min(travel.current, Math.max(0, startOffset.current + (e.clientX - startX.current)));
    paint(x);
    /* one soft tick per quarter crossed, so the track has detents to feel */
    const quarter = travel.current > 0 ? Math.floor((x / travel.current) * 4) : 0;
    if (quarter > lastTick.current) sfx.hit({ freq: 2600, vol: 0.028, dur: 0.035, q: 2.4 });
    lastTick.current = quarter;
  }

  function onKnobUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      knobRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!reduced) {
      animate(knobScale.current, 1, {
        ...SNAP,
        onUpdate: (v) => {
          knobScale.current = v;
          paint(offset.current);
        },
      });
    }
    if (offset.current >= travel.current * 0.88) confirmOrder();
    else {
      sfx.tone({ freq: 330, to: 208, dur: 0.16, type: "triangle", vol: 0.07 });
      springTo(0, { type: "spring", stiffness: 420, damping: 30, mass: 0.8 });
    }
  }

  /* keyboard: Enter or Space confirms, the arrows walk the knob along */
  function onSliderKey(e: React.KeyboardEvent) {
    if (confirmedRef.current) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      confirmOrder();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = travel.current / 6;
      const next = Math.min(
        travel.current,
        Math.max(0, offset.current + (e.key === "ArrowRight" ? step : -step)),
      );
      if (next >= travel.current) confirmOrder();
      else springTo(next, { type: "spring", stiffness: 500, damping: 30 });
    }
  }

  /* --- render -------------------------------------------------------------- */

  return (
    <div className="pcart">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id={`pcart-goo-${gooId}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      <article className="pcart__card" ref={cardRef} style={{ opacity: 0 }} aria-label={`${title} by ${brand}`}>
        <div
          className="pcart__tile"
          ref={tileRef}
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={`${title}, ${price} dollars. Open product details`}
          onClick={() => setCardOpen(!openRef.current)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCardOpen(!openRef.current);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pcart__shoe" ref={shoeRef} src={image} alt={title} draggable={false} />

          <button
            type="button"
            className="pcart__heart"
            ref={heartRef}
            aria-pressed={liked}
            aria-label="Save to wishlist"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleLike}
          >
            <span
              className="pcart__sparks"
              ref={sparksRef}
              style={{ filter: `url(#pcart-goo-${gooId})` }}
              aria-hidden="true"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} className="pcart__spark" />
              ))}
            </span>
            <svg
              className="pcart__heartIcon"
              ref={heartIconRef}
              viewBox="0 0 24 24"
              fill={liked ? "#e0182d" : "none"}
              stroke={liked ? "#e0182d" : "#ffffff"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        </div>

        <div className="pcart__fold" ref={doneRef} aria-live="polite">
          <div className="pcart__doneInner" ref={doneInnerRef}>
            <span className="pcart__doneTick">
              <svg viewBox="0 0 20 20" fill="none" stroke="#0d2e18" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 10.4 8.3 14.2 15.5 6.6" />
              </svg>
            </span>
            <span className="pcart__doneLabel">Order confirmed</span>
          </div>
        </div>

        <div className="pcart__fold" ref={bodyRef}>
          <div className="pcart__bodyInner" ref={bodyInnerRef}>
            <h2 className="pcart__title" data-stagger>
              {title}
            </h2>
            <p className="pcart__brand" data-stagger>
              {brand}
            </p>

            <div className="pcart__priceRow">
              <div className="pcart__price" data-stagger>
                <span className="pcart__priceNum" ref={priceRef}>
                  {price}
                </span>
                <span>$</span>
              </div>

              <button type="button" className="pcart__bag" data-stagger ref={bagRef} aria-label="Add one to bag" onClick={addToBag}>
                <span className="pcart__badge" ref={badgeRef}>
                  0
                </span>
                {/* a soft-shouldered tote with an arced handle and a centred plus */}
                <svg viewBox="0 0 24 24" fill="none" stroke="#151515" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5.6 8.6h12.8a.9.9 0 0 1 .9.97l-.73 9.06A2.4 2.4 0 0 1 16.18 20.8H7.82a2.4 2.4 0 0 1-2.39-2.17l-.73-9.06a.9.9 0 0 1 .9-.97z" />
                  <path d="M9.1 8.6V6.9a2.9 2.9 0 0 1 5.8 0v1.7" />
                  <g ref={bagPlusRef} style={{ transformOrigin: "12px 14.1px" }}>
                    <path d="M12 11.9v4.4" />
                    <path d="M9.8 14.1h4.4" />
                  </g>
                </svg>
              </button>
            </div>

            <div
              className="pcart__slider"
              data-stagger
              ref={sliderRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-label="Slide to confirm your order"
              onKeyDown={onSliderKey}
            >
              <div className="pcart__fill" ref={fillRef} />
              <span className="pcart__slideLabel" ref={labelRef}>
                Slide to confirm
              </span>
              <button
                type="button"
                className="pcart__knob"
                ref={knobRef}
                aria-label="Slide to confirm your order"
                onPointerDown={onKnobDown}
                onPointerMove={onKnobMove}
                onPointerUp={onKnobUp}
                onPointerCancel={onKnobUp}
              >
                <span className="pcart__knobFaces">
                  <svg ref={arrowRef} viewBox="0 0 20 20" fill="none" stroke="#151515" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 10h13" />
                    <path d="M11.5 5 16.5 10l-5 5" />
                  </svg>
                  <svg
                    className="pcart__knobCheck"
                    ref={checkRef}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="#151515"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10.5 8.2 14.7 16 6.5" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
