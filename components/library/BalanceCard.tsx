"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { animate, hover, press, useReducedMotion } from "motion/react";
import "./balance-card.css";

/* ------------------------------------------------------------------ props -- */

export type BalanceCardProps = {
  /** Opening balance, always held in USD whatever is on display. */
  balance?: number;
  /** Which currency the card opens on. */
  currency?: Currency;
  /** The four quick amounts, in USD. */
  presets?: number[];
  /** Synthesised deposit / withdraw cues. */
  sound?: boolean;
  /**
   * The credit line under the card, with the control that mutes the cues.
   * Turn it off when you drop the card into your own layout.
   */
  credit?: boolean;
  /** Fired after a deposit or a withdrawal settles. */
  onSettle?: (change: { kind: Drawer; usd: number; balance: number }) => void;
};

export type Currency = "USD" | "EUR" | "GBP" | "INR";
type Drawer = "deposit" | "withdraw";

const RATES: Record<Currency, number> = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.4 };
const SIGN: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };
const CODES = Object.keys(RATES) as Currency[];

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;
const SOFT = { type: "spring", stiffness: 260, damping: 30 } as const;
const OUT = [0.16, 1, 0.3, 1] as const;

const ROW_H = 38;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ sound -- */

/**
 * Every cue is synthesised at play time, so the component ships no audio and
 * fetches nothing. The context is built lazily because a browser will not let
 * one start outside a gesture.
 */
function useSfx(enabled: boolean) {
  const ref = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  /* read live, so flipping the prop mutes the next cue rather than the next mount */
  const on = useRef(enabled);
  on.current = enabled;

  const ctx = useCallback(() => {
    if (!on.current || typeof window === "undefined") return null;
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ref.current) {
      const audio = new AC();
      const master = audio.createGain();
      master.gain.value = 0.9;
      master.connect(audio.destination);
      ref.current = { ctx: audio, master };
    }
    if (ref.current.ctx.state === "suspended") void ref.current.ctx.resume();
    return ref.current;
  }, []);

  useEffect(() => () => void ref.current?.ctx.close().catch(() => {}), []);

  return useRef({
    tone(t0: number, freq: number, dur: number, o: { type?: OscillatorType; gain?: number; to?: number } = {}) {
      const engine = ctx();
      if (!engine) return;
      const osc = engine.ctx.createOscillator();
      const gain = engine.ctx.createGain();
      osc.type = o.type ?? "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(o.gain ?? 0.18, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(engine.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },
    /* short filtered noise — the drawer clack of a till, the rustle of notes */
    noise(t0: number, dur: number, o: { gain?: number; freq?: number; q?: number } = {}) {
      const engine = ctx();
      if (!engine) return;
      const len = Math.max(1, Math.floor(engine.ctx.sampleRate * dur));
      const buffer = engine.ctx.createBuffer(1, len, engine.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = engine.ctx.createBufferSource();
      src.buffer = buffer;
      const band = engine.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = o.freq ?? 3200;
      band.Q.value = o.q ?? 1.1;
      const gain = engine.ctx.createGain();
      gain.gain.value = o.gain ?? 0.12;
      src.connect(band).connect(gain).connect(engine.master);
      src.start(t0);
    },
    now() {
      return ctx()?.ctx.currentTime ?? 0;
    },
  }).current;
}

/* -------------------------------------------------------------- component -- */

/**
 * An animated balance card: a counting figure, a gooey currency selector, and
 * a drawer that takes a deposit or a withdrawal.
 *
 * Nothing here is stored twice. The balance is held once, in USD, and the
 * figure on screen, the preset amounts and the toast are all read back out of
 * it through the current rate — so a currency swap cannot leave two numbers
 * disagreeing about what the account holds.
 */
export default function BalanceCard({
  balance = 3400089.23,
  currency: initialCurrency = "USD",
  presets = [500, 1000, 5000, 25000],
  sound = true,
  credit = true,
  onSettle,
}: BalanceCardProps) {
  const reduced = useReducedMotion();
  /* the speaker in the credit line turns the cues off without unmounting them */
  const [audible, setAudible] = useState(sound);
  const sfx = useSfx(sound && audible && !reduced);
  const gooId = useId().replace(/:/g, "");

  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [blobIndex, setBlobIndex] = useState(CODES.indexOf(initialCurrency));

  /* the account, in USD — the single source every figure is derived from */
  const baseRef = useRef(balance);
  /* what the counter is showing right now, so the next count starts from it */
  const shownRef = useRef(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const signRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const chevRef = useRef<SVGSVGElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerInnerRef = useRef<HTMLDivElement>(null);
  const withdrawRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTextRef = useRef<HTMLSpanElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* the drawer starts shut in CSS, so the first render has nothing to close */
  const openedOnce = useRef(false);

  const rate = RATES[currency];
  const converted = useCallback(() => baseRef.current * RATES[currency], [currency]);

  /* --- the counter ------------------------------------------------------- */

  const countTo = useCallback(
    (target: number, duration = 1.1) => {
      const from = shownRef.current;
      shownRef.current = target;
      const el = amountRef.current;
      if (!el) return;
      if (reduced) {
        el.textContent = fmt(target);
        return;
      }
      animate(from, target, {
        duration,
        ease: OUT,
        onUpdate: (v) => {
          el.textContent = fmt(v);
        },
      });
      /* the final figure lands even if rAF was throttled part-way through */
      setTimeout(() => {
        if (shownRef.current === target) el.textContent = fmt(target);
      }, duration * 1000 + 120);
    },
    [reduced],
  );

  /* a quick vertical swap on a text node — the write is on a timer rather than
     an animation promise, so the copy is right even in a backgrounded tab */
  const swapText = useCallback(
    (el: HTMLElement | null, write: () => void) => {
      if (!el) return;
      if (reduced) {
        write();
        return;
      }
      animate(el, { y: [0, -14], opacity: [1, 0] }, { duration: 0.16, ease: "easeIn" });
      setTimeout(() => {
        write();
        animate(el, { y: [14, 0], opacity: [0, 1] }, SPRING);
      }, 160);
    },
    [reduced],
  );

  /* --- trend chip -------------------------------------------------------- */

  const pulseChip = useCallback(() => {
    if (reduced || !arrowRef.current || !pctRef.current) return;
    const pct = pctRef.current;
    animate(arrowRef.current, { y: [6, -3, 0], opacity: [0, 1, 1] }, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    animate(0, 13, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        pct.textContent = String(Math.round(v));
      },
    });
  }, [reduced]);

  /* --- entrance ---------------------------------------------------------- */

  useEffect(() => {
    const card = cardRef.current;
    const root = rootRef.current;
    if (!card || !root) return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-rise]"));

    if (reduced) {
      card.style.opacity = "1";
      rows.forEach((el) => {
        el.style.opacity = "1";
      });
      shownRef.current = converted();
      if (amountRef.current) amountRef.current.textContent = fmt(converted());
      if (pctRef.current) pctRef.current.textContent = "13";
      return;
    }

    animate(card, { opacity: [0, 1], y: [26, 0], scale: [0.965, 1] }, { ...SOFT, stiffness: 200, damping: 26 });
    rows.forEach((el, i) => {
      el.style.opacity = "0";
      animate(el, { opacity: [0, 1], y: [16, 0] }, { ...SPRING, delay: 0.12 + i * 0.07 });
    });

    const count = setTimeout(() => countTo(converted(), 1.5), 280);
    const chip = setTimeout(() => pulseChip(), 900);
    /* a card opened in a background tab never gets frames — settle it anyway */
    const settle = setTimeout(() => {
      card.style.opacity = "1";
      rows.forEach((el) => {
        if (Number.parseFloat(getComputedStyle(el).opacity) < 0.99) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
    }, 1600);

    return () => {
      clearTimeout(count);
      clearTimeout(chip);
      clearTimeout(settle);
    };
    // the entrance plays once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- pointer glow ------------------------------------------------------ */

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow || reduced) return;

    const move = (e: PointerEvent) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty("--pbal-mx", `${e.clientX - box.left}px`);
      card.style.setProperty("--pbal-my", `${e.clientY - box.top}px`);
    };
    card.addEventListener("pointermove", move);
    const stop = hover(card, () => {
      animate(glow, { opacity: 1 }, { duration: 0.35 });
      return () => animate(glow, { opacity: 0 }, { duration: 0.45 });
    });
    return () => {
      card.removeEventListener("pointermove", move);
      stop();
    };
  }, [reduced]);

  /* --- hover / press physics on every control ---------------------------- */

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-springy]")).flatMap((el) => {
      const lift = Number(el.dataset.springy) || 1.03;
      return [
        hover(el, () => {
          animate(el, { scale: lift }, SPRING);
          return () => animate(el, { scale: 1 }, SPRING);
        }),
        press(el, () => {
          animate(el, { scale: 0.955 }, { type: "spring", stiffness: 700, damping: 30 });
          return () => animate(el, { scale: 1 }, { type: "spring", stiffness: 500, damping: 18 });
        }),
      ];
    });
    return () => stops.forEach((stop) => stop());
  }, [reduced, drawer]);

  /* --- currency menu ------------------------------------------------------ */

  const moveBlob = useCallback(
    (index: number) => {
      setBlobIndex(index);
      const y = index * ROW_H;
      if (!headRef.current || !tailRef.current) return;
      if (reduced) {
        headRef.current.style.transform = `translateY(${y}px)`;
        tailRef.current.style.transform = `translateY(${y}px)`;
        return;
      }
      /* the head snaps and the tail trails, so the blur reads as one liquid */
      animate(headRef.current, { y, scaleY: [1.16, 1], scaleX: [0.94, 1] }, SPRING);
      animate(tailRef.current, { y }, { type: "spring", stiffness: 170, damping: 20 });
    },
    [reduced],
  );

  /*
   * The open flag is mirrored into a ref so that closing can decide whether
   * there is anything to close without reading it back out of a state updater.
   * Animations are side effects, and React is free to run an updater twice —
   * under StrictMode in development it always does — which fired every close
   * animation twice from the same click.
   */
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;

  const closeMenu = useCallback(() => {
    if (!menuOpenRef.current) return;
    menuOpenRef.current = false;
    setMenuOpen(false);

    if (chevRef.current) animate(chevRef.current, { rotate: 0 }, reduced ? { duration: 0 } : SPRING);
    const blobs = [headRef.current, tailRef.current].filter(Boolean) as HTMLElement[];
    if (blobs.length) animate(blobs, { opacity: 0 }, { duration: reduced ? 0 : 0.15 });
    if (menuRef.current) {
      animate(
        menuRef.current,
        { opacity: 0, y: -8, scale: 0.92 },
        reduced ? { duration: 0 } : { duration: 0.18, ease: "easeIn" },
      );
    }
  }, [reduced]);

  const openMenu = useCallback(() => {
    if (menuOpenRef.current) return;
    menuOpenRef.current = true;
    setMenuOpen(true);
    const index = CODES.indexOf(currency);
    setBlobIndex(index);

    if (headRef.current) headRef.current.style.transform = `translateY(${index * ROW_H}px)`;
    if (tailRef.current) tailRef.current.style.transform = `translateY(${index * ROW_H}px)`;

    const quick = reduced ? { duration: 0 } : SPRING;
    if (chevRef.current) animate(chevRef.current, { rotate: 180 }, quick);
    if (menuRef.current) animate(menuRef.current, { opacity: [0, 1], y: [-10, 0], scale: [0.9, 1] }, quick);
    const blobs = [headRef.current, tailRef.current].filter(Boolean) as HTMLElement[];
    if (blobs.length) animate(blobs, { opacity: [0, 1] }, { duration: reduced ? 0 : 0.22 });

    if (reduced || !menuRef.current) return;
    menuRef.current.querySelectorAll<HTMLElement>("[data-row]").forEach((row, i) => {
      animate(row, { opacity: [0, 1], x: [10, 0] }, { ...SPRING, delay: 0.04 + i * 0.035 });
    });
  }, [currency, menuOpen, reduced]);

  /* close on a click outside, or on Escape */
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) closeMenu();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        setDrawer(null);
      }
    };
    document.addEventListener("click", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", away);
      document.removeEventListener("keydown", key);
    };
  }, [menuOpen, closeMenu]);

  function selectCurrency(code: Currency) {
    moveBlob(CODES.indexOf(code));
    setCurrency(code);
    swapText(labelRef.current, () => {
      if (labelRef.current) labelRef.current.textContent = code;
    });
    if (signRef.current) signRef.current.textContent = SIGN[code];
    const next = baseRef.current * RATES[code];
    swapText(amountRef.current, () => {
      shownRef.current = next;
      if (amountRef.current) amountRef.current.textContent = fmt(next);
    });
    setPicked(null);
    setTimeout(closeMenu, 160);
  }

  /* --- drawer ------------------------------------------------------------ */

  /* the drawer is measured every time rather than remembered: the preset row
     reflows with the currency, so a stored height would be wrong after a swap */
  useEffect(() => {
    const box = drawerRef.current;
    const inner = drawerInnerRef.current;
    if (!box || !inner) return;

    /*
     * On the very first run there is nothing to close: the drawer is already
     * shut in the stylesheet. Animating it from its natural height down to zero
     * here would show it open for a frame and then snap it away.
     */
    if (!drawer && !openedOnce.current) {
      box.style.height = "0px";
      return;
    }
    if (drawer) openedOnce.current = true;

    const to = drawer ? inner.offsetHeight : 0;

    if (reduced) {
      box.style.height = drawer ? "auto" : "0px";
      return;
    }

    if (drawer) {
      animate(box, { height: [box.offsetHeight, to] }, { ...SOFT, stiffness: 240 });
      animate(inner, { opacity: [0, 1], y: [-12, 0] }, SPRING);
    } else {
      box.style.height = `${inner.offsetHeight}px`;
      animate(inner, { opacity: 0, y: -8 }, { duration: 0.16 });
      animate(box, { height: 0 }, { ...SOFT, stiffness: 300 });
    }

    /* the drawer lands on its resting height whether or not frames ever ran */
    const settle = setTimeout(() => {
      box.getAnimations().forEach((a) => a.cancel());
      box.style.height = drawer ? "auto" : "0px";
      if (drawer) {
        inner.style.opacity = "1";
        inner.style.transform = "none";
      }
    }, 700);
    return () => clearTimeout(settle);
  }, [drawer, currency, reduced]);

  function tick() {
    sfx.tone(sfx.now(), 880, 0.05, { type: "sine", gain: 0.05 });
  }

  function openDrawer(kind: Drawer) {
    closeMenu();
    tick();
    setPicked(null);
    setDrawer((current) => (current === kind ? null : kind));
  }

  function pickAmount(usd: number, el: HTMLButtonElement) {
    setPicked(usd);
    tick();
    if (reduced) return;
    animate(el, { scale: [0.9, 1.06, 1] }, { duration: 0.34, ease: [0.22, 1, 0.36, 1] });
  }

  /* --- confirm ----------------------------------------------------------- */

  function showToast(text: string) {
    clearTimeout(toastTimer.current);
    if (toastTextRef.current) toastTextRef.current.textContent = text;
    const toast = toastRef.current;
    if (!toast) return;
    /* being up is a resting state; the rise is dressing on top of it */
    toast.style.opacity = "1";
    if (!reduced) animate(toast, { opacity: [0, 1], y: [18, 0], scale: [0.94, 1] }, SPRING);
    toastTimer.current = setTimeout(() => {
      toast.style.opacity = "0";
      if (!reduced) animate(toast, { opacity: 0, y: 10 }, { duration: 0.3 });
    }, 2200);
  }

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function confirm() {
    if (busy || picked == null || !drawer) return;
    const kind = drawer;
    const usd = picked;
    setBusy(true);

    await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : 780));

    if (kind === "withdraw") {
      baseRef.current = Math.max(0, baseRef.current - usd);
      if (!reduced && cardRef.current) animate(cardRef.current, { x: [0, -5, 5, -3, 0] }, { duration: 0.4 });
      /* a till: drawer clack, two bells, a soft thump behind them */
      const t = sfx.now();
      sfx.noise(t, 0.05, { gain: 0.14, freq: 2600, q: 0.7 });
      sfx.tone(t + 0.01, 180, 0.16, { type: "sine", gain: 0.14, to: 90 });
      sfx.tone(t + 0.05, 1318.5, 0.55, { gain: 0.16 });
      sfx.tone(t + 0.09, 1760, 0.5, { gain: 0.12 });
      sfx.tone(t + 0.09, 2637, 0.34, { type: "sine", gain: 0.05 });
      sfx.noise(t + 0.34, 0.22, { gain: 0.035, freq: 1400, q: 0.6 });
    } else {
      baseRef.current += usd;
      /* coins dropping in: a bright ascending arpeggio */
      const t = sfx.now();
      sfx.noise(t, 0.07, { gain: 0.05, freq: 5200, q: 0.8 });
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => sfx.tone(t + i * 0.065, f, 0.34 - i * 0.04, { gain: 0.15 }));
      sfx.tone(t + 0.26, 2093, 0.3, { type: "sine", gain: 0.05 });
    }

    countTo(baseRef.current * rate, 0.9);
    if (!reduced && amountRef.current) {
      animate(amountRef.current, { scale: [1, 1.045, 1] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
    }

    setBusy(false);
    setDrawer(null);
    showToast(`${kind === "withdraw" ? "Withdrew" : "Deposited"} ${SIGN[currency]}${fmt(usd * rate)}`);
    onSettle?.({ kind, usd, balance: baseRef.current });
  }

  /* a ripple where the pointer landed on the accent button */
  function ripple(e: React.PointerEvent<HTMLButtonElement>) {
    const btn = withdrawRef.current;
    if (!btn || reduced) return;
    const box = btn.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "pbal__ripple";
    dot.style.left = `${e.clientX - box.left}px`;
    dot.style.top = `${e.clientY - box.top}px`;
    btn.appendChild(dot);
    animate(dot, { scale: [1, 26], opacity: [0.5, 0] }, { duration: 0.65, ease: "easeOut" }).then(() => dot.remove());
  }

  /* --- render ------------------------------------------------------------ */

  return (
    <div className="pbal" ref={rootRef}>
      {/* the liquid filter the currency list rides on */}
      <svg className="pbal__defs" aria-hidden="true">
        <defs>
          <filter id={`pbal-goo-${gooId}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <section className="pbal__card" ref={cardRef} style={{ opacity: 0 }}>
        <div className="pbal__glow" ref={glowRef} aria-hidden="true" />

        <div className="pbal__inner">
          <div className="pbal__top">
            <div style={{ minWidth: 0 }}>
              <p className="pbal__label" data-rise>
                Current Balance
              </p>
              <h2 className="pbal__amount" data-rise>
                <span className="pbal__sign" ref={signRef}>
                  {SIGN[initialCurrency]}
                </span>
                <span className="pbal__tnum" ref={amountRef}>
                  0.00
                </span>
              </h2>
            </div>

            <div className="pbal__currency" data-rise>
              <button
                type="button"
                className="pbal__currencyBtn"
                data-springy="1.03"
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuOpen) closeMenu();
                  else openMenu();
                }}
              >
                <svg
                  className="pbal__chev"
                  ref={chevRef}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
                <span ref={labelRef}>{currency}</span>
              </button>

              <div
                className="pbal__menu"
                ref={menuRef}
                style={{ pointerEvents: menuOpen ? "auto" : "none" }}
              >
                <div className="pbal__sheet">
                  <div className="pbal__goo" style={{ filter: `url(#pbal-goo-${gooId})` }} aria-hidden="true">
                    <div className="pbal__blob" ref={tailRef} />
                    <div className="pbal__blob" ref={headRef} />
                  </div>

                  <ul className="pbal__list" role="listbox" aria-label="Currency">
                    {CODES.map((code, i) => (
                      <li key={code} role="option" aria-selected={code === currency}>
                        <button
                          type="button"
                          data-row
                          className={`pbal__row${i === blobIndex ? " pbal__row--on" : ""}`}
                          onClick={() => selectCurrency(code)}
                          onPointerEnter={() => moveBlob(i)}
                        >
                          <span>{code}</span>
                          <span className="pbal__rowSign">{SIGN[code]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="pbal__chipRow" data-rise>
            <button type="button" className="pbal__chip" data-springy="1.05" onClick={pulseChip}>
              <svg
                className="pbal__arrow"
                ref={arrowRef}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
              <span className="pbal__pct">
                <span className="pbal__tnum" ref={pctRef}>
                  13
                </span>
                %
              </span>
              <span className="pbal__since">in 5 days</span>
            </button>
          </div>

          <div className="pbal__actions" data-rise>
            <button type="button" className="pbal__action" data-springy="1.03" onClick={() => openDrawer("deposit")}>
              Deposit
            </button>
            <button
              type="button"
              className="pbal__action pbal__action--accent"
              data-springy="1.03"
              ref={withdrawRef}
              onPointerDown={ripple}
              onClick={() => openDrawer("withdraw")}
            >
              Withdraw
            </button>
          </div>

          <div className="pbal__drawer" ref={drawerRef}>
            <div className="pbal__drawerInner" ref={drawerInnerRef}>
              <div className="pbal__well">
                <p className="pbal__wellTitle">
                  Choose an amount to {drawer === "withdraw" ? "withdraw" : "deposit"}
                </p>

                <div className="pbal__presets">
                  {presets.map((usd) => {
                    const value = usd * rate;
                    return (
                      <button
                        key={usd}
                        type="button"
                        className={`pbal__preset${picked === usd ? " pbal__preset--on" : ""}`}
                        onClick={(e) => pickAmount(usd, e.currentTarget)}
                      >
                        {SIGN[currency]}
                        {value >= 1000 ? `${Math.round(value / 1000)}k` : Math.round(value)}
                      </button>
                    );
                  })}
                </div>

                <div className="pbal__confirmRow">
                  <button type="button" className="pbal__cancel" data-springy="1.03" onClick={() => setDrawer(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pbal__confirm"
                    data-springy="1.03"
                    disabled={picked == null || busy}
                    onClick={confirm}
                  >
                    {busy ? "Processing…" : `Confirm ${drawer === "withdraw" ? "withdrawal" : "deposit"}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pbal__toast" ref={toastRef} role="status">
          <div className="pbal__toastBody">
            <svg
              className="pbal__toastTick"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span ref={toastTextRef}>Done</span>
          </div>
        </div>
      </section>

      {credit && (
        <div className="pbal__credit">
          <p className="pbal__creditText">
            Inspiration from{" "}
            <a
              className="pbal__creditLink"
              href="https://in.pinterest.com/pin/1056657131344579045/"
              target="_blank"
              rel="noopener noreferrer"
            >
              pinterest.com
            </a>
          </p>

          <button
            type="button"
            className="pbal__sfx"
            aria-pressed={audible}
            aria-label={audible ? "Mute the sound effects" : "Unmute the sound effects"}
            title={audible ? "Mute the sound effects" : "Unmute the sound effects"}
            onClick={() => setAudible((on) => !on)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              {audible ? (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 6a9 9 0 0 1 0 12" />
                </>
              ) : (
                <path d="M3 3l18 18" />
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
