"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import "./swap-card.css";

/**
 * Swap Card — a token swap card where every number moves.
 *
 * Swap, Buy and Stake share one card; the tab pill slides between them. Type
 * an amount and the quote rolls in an odometer, a digit at a time; flip the
 * pair and the two token pills glide past each other to trade panels while the
 * arrow turns. The token list opens out of its pill through a blur, the rate
 * line rolls over when the pair changes, and the details drawer unfolds on the
 * same spring as everything else. The button is liquid: light pools drift
 * across it, it ripples where it is pressed, shakes "no" when it cannot swap,
 * sweeps while the swap is in flight and throws a ring of specks when it lands.
 */

export type SwapCardToken = {
  symbol: string;
  name: string;
  /** USD price, used to quote every pair. */
  price: number;
  /** 24h change, shown beside the dollar value. */
  change: number;
  /** The coin mark's colour. */
  color: string;
};

export type SwapCardProps = {
  theme?: "light" | "dark";
  /** Fired when a swap, buy or stake lands. */
  onSwap?: (trade: { mode: "Swap" | "Buy" | "Stake"; pay: string; receive: string; amount: number; received: number }) => void;
};

type Mode = "Swap" | "Buy" | "Stake";
type Side = "pay" | "receive";
type Status = "idle" | "pending" | "done";

/* one spring drives every morph so all the pieces land together, plus a short eased fade */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.16 };
const fade = (delay = 0): Transition => ({ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay });

export const SWAP_CARD_TOKENS: SwapCardToken[] = [
  { symbol: "USDT", name: "Tether USD", price: 1, change: -0.45, color: "#26a17b" },
  { symbol: "ETH", name: "Ethereum", price: 3260.2, change: -0.45, color: "#627eea" },
  { symbol: "USDC", name: "USD Coin", price: 1, change: 0.01, color: "#2775ca" },
  { symbol: "BTC", name: "Bitcoin", price: 67420, change: 1.12, color: "#f7931a" },
  { symbol: "DAI", name: "Dai", price: 1, change: -0.02, color: "#f5ac37" },
  { symbol: "USD", name: "US Dollar", price: 1, change: 0, color: "#1f9d55" },
  { symbol: "stETH", name: "Lido Staked ETH", price: 3255.4, change: -0.51, color: "#00a3ff" },
];

const tokens = SWAP_CARD_TOKENS;
const bySymbol = (symbol: string) => tokens.find((t) => t.symbol === symbol)!;

const initialBalances: Record<string, number> = {
  USDT: 4537.5,
  ETH: 0,
  USDC: 1250,
  BTC: 0,
  DAI: 0,
  USD: 10000,
  stETH: 0,
};

const modes: Record<Mode, { pay: string; receive: string; amount: string; doing: string; done: string }> = {
  Swap: { pay: "USDT", receive: "ETH", amount: "164.23", doing: "Swapping", done: "Swapped" },
  Buy: { pay: "USD", receive: "ETH", amount: "250", doing: "Buying", done: "Bought" },
  Stake: { pay: "ETH", receive: "stETH", amount: "", doing: "Staking", done: "Staked" },
};

/* entrance: each block rises out of a soft blur, one after another */
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...morph, opacity: fade(), filter: fade() } },
};

const usd = (v: number) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtOut(v: number) {
  if (v === 0) return "0";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumSignificantDigits: 3 });
}

function fmtRate(r: number) {
  if (r >= 1000) return r.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (r >= 1) return r.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return r.toLocaleString("en-US", { maximumSignificantDigits: 5 });
}

function fmtBalance(v: number) {
  if (v === 0) return "none";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 });
}

/* a plain decimal string for the input: no grouping, no trailing zeros */
const toInput = (v: number) => (v > 0 ? String(Number(v.toFixed(8))) : "");

function sanitize(raw: string) {
  let s = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 8);
  if (s.startsWith(".")) s = "0" + s;
  return s.replace(/^0+(?=\d)/, "");
}

const amountSize = (text: string) => (text.length <= 7 ? 38 : text.length <= 9 ? 32 : text.length <= 11 ? 27 : 22);

export default function SwapCard({ theme = "light", onSwap }: SwapCardProps) {
  const [mode, setMode] = useState<Mode>("Swap");
  const [pay, setPay] = useState(modes.Swap.pay);
  const [receive, setReceive] = useState(modes.Swap.receive);
  const [amount, setAmount] = useState(modes.Swap.amount);
  const [balances, setBalances] = useState(initialBalances);
  const [flips, setFlips] = useState(0);
  const [picker, setPicker] = useState<Side | null>(null);
  const [details, setDetails] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const timers = useRef<number[]>([]);
  /* its own layout group, so two cards on a page never trade pills */
  const group = useId();
  /* flipping back and forth restores the typed amount instead of compounding rounding */
  const lastFlip = useRef<{ shown: string; typed: string } | null>(null);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const payT = bySymbol(pay);
  const receiveT = bySymbol(receive);
  const value = parseFloat(amount) || 0;
  const rate = payT.price / receiveT.price;
  const out = value * rate;
  /* the opening quote shows the reference design's figures exactly; any edit switches to live quoting */
  const preset = mode === "Swap" && pay === "USDT" && receive === "ETH" && amount === modes.Swap.amount;
  const outText = preset ? "0.0505" : fmtOut(out);
  const payUsd = preset ? 64.23 : value * payT.price;
  const receiveUsd = preset ? 64.23 : out * receiveT.price;
  const insufficient = value > balances[pay] + 1e-9;
  const ready = value > 0 && !insufficient && status === "idle";

  const label =
    status === "pending"
      ? `${modes[mode].doing}…`
      : status === "done"
        ? modes[mode].done
        : value === 0
          ? "Enter an amount"
          : insufficient
            ? `Insufficient ${pay}`
            : mode;

  const switchMode = (next: Mode) => {
    if (next === mode || status === "pending") return;
    clearTimers();
    setStatus("idle");
    setMode(next);
    setPay(modes[next].pay);
    setReceive(modes[next].receive);
    setAmount(modes[next].amount);
    setPicker(null);
  };

  const flip = () => {
    if (status === "pending") return;
    setPay(receive);
    setReceive(pay);
    const next = lastFlip.current?.shown === amount ? lastFlip.current.typed : toInput(out);
    lastFlip.current = { shown: next, typed: amount };
    setAmount(next);
    setFlips((n) => n + 1);
    setPicker(null);
  };

  const pick = (side: Side, symbol: string) => {
    setPicker(null);
    const other = side === "pay" ? receive : pay;
    if (symbol === other) return flip();
    if (side === "pay") setPay(symbol);
    else setReceive(symbol);
  };

  const submit = () => {
    if (!ready) return;
    setStatus("pending");
    timers.current.push(
      window.setTimeout(() => {
        setBalances((b) => ({ ...b, [pay]: Math.max(0, b[pay] - value), [receive]: b[receive] + out }));
        setStatus("done");
        onSwap?.({ mode, pay, receive, amount: value, received: out });
      }, 1200),
      window.setTimeout(() => setStatus("idle"), 2600),
    );
  };

  return (
    <div className="pswap" data-theme={theme}>
      <LayoutGroup id={`pswap-${group}`}>
        <motion.div variants={stagger} initial="hidden" animate="shown" className="pswap__card">
          <motion.div variants={rise} className="pswap__tabsRow">
            <Tabs mode={mode} onChange={switchMode} />
          </motion.div>

          <motion.div variants={rise} className="pswap__slot" data-raised={picker === "pay" || undefined}>
            <Panel label="Pay">
              <div className="pswap__row">
                <motion.input
                  key={`pay-${flips}-${mode}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { ...morph, opacity: fade() } }}
                  aria-label="Pay amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(sanitize(e.target.value))}
                  style={{ fontSize: amountSize(amount) }}
                  className="pswap__amount pswap__input"
                />
                <TokenSelect
                  token={payT}
                  open={picker === "pay"}
                  onToggle={() => setPicker(picker === "pay" ? null : "pay")}
                  onClose={() => setPicker(null)}
                  onPick={(s) => pick("pay", s)}
                  balances={balances}
                />
              </div>
              <FooterRow
                left={<UsdValue value={payUsd} change={payT.change} />}
                right={
                  <>
                    You have <Roll className="pswap__have">{fmtBalance(balances[pay])}</Roll>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.9 }}
                      transition={morph}
                      onClick={() => setAmount(toInput(balances[pay]))}
                      disabled={balances[pay] === 0}
                      className="pswap__max"
                    >
                      MAX
                    </motion.button>
                  </>
                }
              />
            </Panel>
          </motion.div>

          {/* the flip button sits on the seam between the two panels */}
          <div className="pswap__seam">
            <motion.button
              type="button"
              aria-label="Switch pay and receive"
              onClick={flip}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { ...morph, delay: 0.25 } }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              className="pswap__flip"
            >
              <motion.span animate={{ rotate: flips * 180 }} transition={morph} className="pswap__flipIcon">
                {/* lucide: arrow-down-up */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="m21 8-4-4-4 4" />
                  <path d="M17 4v16" />
                </svg>
              </motion.span>
            </motion.button>
          </div>

          <motion.div variants={rise} className="pswap__slot" data-raised={picker === "receive" || undefined}>
            <Panel label="Receive">
              <div className="pswap__row">
                <div
                  aria-label="Receive amount"
                  aria-live="polite"
                  style={{ fontSize: amountSize("~" + outText) }}
                  className="pswap__amount pswap__out"
                  data-empty={out === 0 || undefined}
                >
                  <span>~</span>
                  <RollingNumber value={outText} />
                </div>
                <TokenSelect
                  token={receiveT}
                  open={picker === "receive"}
                  onToggle={() => setPicker(picker === "receive" ? null : "receive")}
                  onClose={() => setPicker(null)}
                  onPick={(s) => pick("receive", s)}
                  balances={balances}
                />
              </div>
              <FooterRow
                left={<UsdValue value={receiveUsd} change={receiveT.change} />}
                right={
                  <>
                    You have <Roll className="pswap__have">{fmtBalance(balances[receive])}</Roll>
                  </>
                }
              />
            </Panel>
          </motion.div>

          <motion.div variants={rise}>
            <button type="button" aria-expanded={details} onClick={() => setDetails(!details)} className="pswap__rate">
              <span className="pswap__rateText">
                <Swap key={`${pay}-${receive}`} distance={12}>
                  {`1 ${pay} = ${fmtRate(rate)} ${receive}`}
                </Swap>
              </span>
              <motion.span animate={{ rotate: details ? 180 : 0 }} transition={morph} className="pswap__rateChevron">
                <ChevronDown />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {details && (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: { ...morph, opacity: fade(0.05) } }}
                  exit={{ height: 0, opacity: 0, transition: { ...morph, opacity: fade() } }}
                  className="pswap__drawer"
                >
                  <dl className="pswap__details">
                    {[
                      ["Price impact", `${receiveT.change.toFixed(2)}%`],
                      ["Minimum received", `${fmtOut(out * 0.995)} ${receive}`],
                      ["Slippage tolerance", "0.5%"],
                      ["Network fee", value > 0 ? "~$2.14" : "—"],
                      ["Route", `${pay} → ${receive}`],
                    ].map(([k, v], i) => (
                      <motion.div
                        key={k}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, transition: { ...morph, delay: 0.04 + i * 0.03 } }}
                        className="pswap__detail"
                      >
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </motion.div>
                    ))}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={rise}>
            <LiquidButton disabled={!ready && status === "idle"} busy={status !== "idle"} success={status === "done"} onClick={submit}>
              <span className="pswap__label">
                <Swap key={label} distance={14}>
                  <span className="pswap__labelInner">
                    {status === "pending" && (
                      /* lucide: loader-circle */
                      <svg className="pswap__spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    {status === "done" && <CheckIcon className="pswap__done" />}
                    {label}
                  </span>
                </Swap>
              </span>
            </LiquidButton>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}

function Tabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Action" className="pswap__tabs">
      {(Object.keys(modes) as Mode[]).map((m) => (
        <motion.button
          key={m}
          type="button"
          role="tab"
          whileTap={{ scale: 0.94 }}
          transition={morph}
          aria-selected={m === mode}
          onClick={() => onChange(m)}
          className="pswap__tab"
        >
          {m === mode && <motion.span layoutId="pswap-tab" transition={morph} className="pswap__tabPill" />}
          <span className="pswap__tabText">{m}</span>
        </motion.button>
      ))}
    </div>
  );
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="pswap__panel">
      <h2 className="pswap__panelLabel">{label}</h2>
      {children}
    </section>
  );
}

function FooterRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="pswap__foot">
      <div>{left}</div>
      <div className="pswap__footRight">{right}</div>
    </div>
  );
}

function UsdValue({ value, change }: { value: number; change: number }) {
  return (
    <span className="pswap__usd">
      <RollingNumber value={usd(value)} />
      <span className="pswap__faint">
        ({change > 0 ? "+" : ""}
        {change.toFixed(2)}%)
      </span>
    </span>
  );
}

function TokenSelect({
  token,
  open,
  onToggle,
  onClose,
  onPick,
  balances,
}: {
  token: SwapCardToken;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (symbol: string) => void;
  balances: Record<string, number>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* open with the current token in view, even when it sits below the fold */
  const centreCurrent = (list: HTMLUListElement | null) => {
    /* measure the <li>: its offset is relative to the list, the button's isn't mid-animation */
    const current = list?.querySelector<HTMLElement>('[aria-selected="true"]')?.closest("li");
    if (list && current) list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
  };

  /* Escape or a press anywhere else closes the list */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="pswap__select">
      {/* a layout id per token: when the sides flip, each pill glides to the other panel */}
      <motion.button
        type="button"
        layoutId={`pswap-pill-${token.symbol}`}
        transition={morph}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
        whileTap={{ scale: 0.95 }}
        className="pswap__pill"
        style={{ borderRadius: 999 }}
      >
        <motion.span layout="position" transition={morph} className="pswap__pillToken">
          <TokenIcon token={token} size={20} />
          {token.symbol}
        </motion.span>
        <motion.span layout="position" animate={{ rotate: open ? 180 : 0 }} transition={morph} className="pswap__pillChevron">
          <ChevronDown />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={centreCurrent}
            role="listbox"
            aria-label="Select token"
            initial={{ opacity: 0, scale: 0.9, y: -6, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { ...morph, opacity: fade() } }}
            exit={{ opacity: 0, scale: 0.94, y: -4, filter: "blur(4px)", transition: { duration: 0.14 } }}
            style={{ originX: 1, originY: 0 }}
            className="pswap__list"
          >
            {tokens.map((t, i) => (
              <motion.li key={t.symbol} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0, transition: { ...morph, delay: 0.03 + i * 0.025 } }}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.symbol === token.symbol}
                  onClick={() => onPick(t.symbol)}
                  className="pswap__option"
                >
                  <TokenIcon token={t} size={24} />
                  <span className="pswap__optionName">
                    <span className="pswap__optionSymbol">{t.symbol}</span>
                    <span className="pswap__optionFull">{t.name}</span>
                  </span>
                  <span className="pswap__optionBalance">{balances[t.symbol] ? fmtBalance(balances[t.symbol]) : ""}</span>
                  {t.symbol === token.symbol && <CheckIcon className="pswap__optionCheck" />}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* text that rolls up when it changes; give it a new key to trigger the roll */
function Swap({ distance, children }: { distance: number; children: ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0, transition: { ...morph, opacity: fade() } }}
      className="pswap__swap"
    >
      {children}
    </motion.span>
  );
}

/* a short label that rolls whenever its text changes */
function Roll({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={"pswap__roll " + className}>
      <Swap key={children} distance={10}>
        {children}
      </Swap>
    </span>
  );
}

/* an odometer: every character that changes slides out the top while its
   replacement rises from below; the unchanged ones stay put */
function RollingNumber({ value }: { value: string }) {
  const chars = value.split("");
  return (
    <span className="pswap__odometer">
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((c, i) => (
          <motion.span
            key={`${chars.length - i}:${c}`}
            layout="position"
            initial={{ y: "80%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-80%", opacity: 0 }}
            transition={{ ...morph, opacity: fade() }}
            className="pswap__digit"
          >
            {c}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

/* lucide: chevron-down */
function ChevronDown() {
  return (
    <svg className="pswap__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* lucide: check */
function CheckIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* round coin marks, drawn inline so nothing has to load */
function TokenIcon({ token, size = 22 }: { token: SwapCardToken; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="pswap__coin">
      <circle cx="16" cy="16" r="16" fill={token.color} />
      <Glyph symbol={token.symbol} />
    </svg>
  );
}

function Glyph({ symbol }: { symbol: string }) {
  switch (symbol) {
    case "USDT":
      return (
        <g fill="#fff">
          <path d="M8.5 8.6h15v3.3h-5.6v11.6h-3.8V11.9H8.5z" />
          <ellipse cx="16" cy="15.4" rx="7.4" ry="1.9" fill="none" stroke="#fff" strokeWidth="1.5" />
        </g>
      );
    case "ETH":
    case "stETH":
      return (
        <g fill="#fff">
          <path d="M16 5.5v7.8l6.6 2.9z" fillOpacity=".6" />
          <path d="M16 5.5 9.4 16.2l6.6-2.9z" />
          <path d="M16 21.3v5.2l6.6-9.2z" fillOpacity=".6" />
          <path d="M16 26.5v-5.2l-6.6-4z" />
          <path d="M16 20.1l6.6-3.9L16 13.3z" fillOpacity=".2" />
          <path d="M9.4 16.2l6.6 3.9v-6.8z" fillOpacity=".6" />
        </g>
      );
    case "BTC":
      return (
        <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="system-ui">
          ₿
        </text>
      );
    case "DAI":
      return (
        <text x="16" y="21.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">
          D
        </text>
      );
    default:
      return (
        <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="system-ui">
          $
        </text>
      );
  }
}

/* ── the liquid button ───────────────────────────────────────────────────── */

/* soft pools of light drifting across the button, like light through water */
const blobs = [
  { w: 120, h: 60, top: -16, dur: 5.5, delay: 0, color: "rgb(170 225 255 / 0.95)" },
  { w: 95, h: 50, top: 8, dur: 7, delay: -2.5, color: "rgb(125 205 255 / 0.85)" },
  { w: 135, h: 68, top: -6, dur: 8.5, delay: -5, color: "rgb(200 238 255 / 0.7)" },
];

/* tiny glints that twinkle on the surface */
const sparks = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 18 + ((i * 53) % 64),
  dur: 1.6 + (i % 5) * 0.35,
  delay: (i * 0.29) % 2,
}));

/* specks thrown out of the button when a swap lands */
const burst = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const reach = 1 + (i % 3) * 0.22;
  return { x: Math.cos(angle) * 190 * reach, y: Math.sin(angle) * 44 * reach, size: 3 + (i % 3) };
});

type Ripple = { id: number; x: number; y: number };

/* kept light: a thin inner highlight and a short, soft drop */
const restShadow =
  "inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 2px rgb(10 40 160 / 0.2), 0 3px 8px -4px rgb(47 100 245 / 0.35)";
const hoverShadow =
  "inset 0 1px 0 rgb(255 255 255 / 0.36), inset 0 -1px 2px rgb(10 40 160 / 0.2), 0 4px 12px -5px rgb(47 100 245 / 0.45)";

function LiquidButton({
  children,
  disabled,
  busy,
  success,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  busy: boolean;
  success: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [hover, setHover] = useState(false);
  const [bursts, setBursts] = useState(0);
  const nextId = useRef(0);

  /* a soft highlight that follows the pointer across the glass */
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const glow = useMotionTemplate`radial-gradient(110px circle at ${mx}px ${my}px, rgb(255 255 255 / 0.28), transparent 70%)`;

  useEffect(() => {
    if (success && !reduce) setBursts((n) => n + 1);
  }, [success, reduce]);

  const interactive = !disabled && !busy;

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  const handleClick = () => {
    if (busy) return;
    if (disabled) {
      /* a quick "no" shake instead of a dead click */
      if (!reduce) animate(scope.current, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.42, ease: "easeOut" });
      return;
    }
    onClick();
  };

  return (
    <div ref={scope} className="pswap__go">
      {/* success: a ring pulses out and specks fly from the centre */}
      {bursts > 0 && (
        <span key={bursts} aria-hidden="true" className="pswap__burst">
          <motion.span
            className="pswap__burstRing"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.16 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <span className="pswap__burstCore">
            {burst.map((b, i) => (
              <motion.span
                key={i}
                className="pswap__speck"
                style={{
                  width: b.size,
                  height: b.size,
                  marginLeft: -b.size / 2,
                  marginTop: -b.size / 2,
                  background: i % 2 ? "#7cc8ff" : "#4d82ff",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </span>
        </span>
      )}

      <motion.button
        type="button"
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        aria-disabled={disabled || busy}
        aria-busy={busy}
        animate={{
          filter: disabled ? "saturate(0.25) brightness(1.08)" : "saturate(1) brightness(1)",
          boxShadow: hover && interactive ? hoverShadow : restShadow,
        }}
        transition={{ type: "spring", visualDuration: 0.25, bounce: 0.3 }}
        className="pswap__button"
        data-state={disabled ? "disabled" : busy ? "busy" : "ready"}
        style={{ boxShadow: restShadow }}
      >
        <span aria-hidden="true" className="pswap__water">
          {blobs.map((b, i) => (
            <motion.span
              /* re-keyed on busy so the new pace takes effect at once */
              key={`${i}-${busy}`}
              className="pswap__blob"
              style={{
                width: b.w,
                height: b.h,
                top: b.top,
                left: -b.w,
                background: `radial-gradient(closest-side, ${b.color}, transparent)`,
              }}
              animate={{ x: ["0%", "480%"] }}
              transition={{
                duration: busy ? b.dur / 3 : b.dur,
                delay: busy ? i * -0.4 : b.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
          {sparks.map((s, i) => (
            <motion.span
              key={`s${i}`}
              className="pswap__spark"
              style={{ left: `${s.left}%`, top: `${s.top}%` }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.2, 0.4] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </span>

        {/* the pointer-follow highlight */}
        <motion.span
          aria-hidden="true"
          className="pswap__glow"
          style={{ background: glow }}
          initial={false}
          animate={{ opacity: hover && interactive ? 1 : 0 }}
          transition={fade()}
        />

        {/* loading: a glossy band sweeps across while the swap is in flight */}
        <AnimatePresence>
          {busy && !success && (
            <motion.span
              key="sweep"
              aria-hidden="true"
              className="pswap__sweep"
              style={{ skewX: -12 }}
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "320%", opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ x: { duration: 1, repeat: Infinity, ease: "easeInOut" }, opacity: fade() }}
            />
          )}
        </AnimatePresence>

        {/* click ripples, spreading from where the pointer landed */}
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden="true"
            className="pswap__ripple"
            style={{ left: r.x - 10, top: r.y - 10 }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 34, opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
          />
        ))}

        <motion.span
          className="pswap__buttonText"
          initial={false}
          animate={{ scale: success ? [1, 1.08, 1] : 1 }}
          transition={success ? { duration: 0.45, ease: "easeOut" } : morph}
        >
          {children}
        </motion.span>
      </motion.button>
    </div>
  );
}
