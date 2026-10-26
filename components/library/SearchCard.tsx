"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import "./search-card.css";

/**
 * Search Card — a search bar that morphs open into a recent-searches card.
 *
 * At rest it is a small pill with a ⌘K hint, resting in the middle of its
 * space. Focus it — click, or ⌘K / Ctrl K from anywhere — and it rises to the
 * top as the same surface grows into a card, a panel of recent searches
 * unfolding under the search row, each with a
 * little drawn tile, and a row of category chips below that. One white sheet
 * glides between the rows under the pointer and a trash button slides in on
 * the row it rests on, with a tooltip. Typing filters the list; Clear all
 * empties it and Restore brings everything back. The chips' count rolls as
 * they are removed. Escape clears the query, then folds the card back into
 * the bar, as does a press anywhere outside it.
 *
 * The motion language is eased tweens, no springs: ease-in-out for things
 * that change size, ease-out for things that appear or follow the pointer.
 */

export type SearchCardProps = {
  theme?: "light" | "dark";
  /** The card's corner radius; the inner panel follows it, 6px tighter. */
  corner?: number;
  /** How many recent searches it starts with, up to four. */
  rows?: number;
  /** Listen for ⌘K / Ctrl K anywhere on the page to open and close it. */
  shortcut?: boolean;
};

const ease = [0.23, 1, 0.32, 1] as const; /* strong ease-out */
const easeInOut = [0.65, 0, 0.35, 1] as const;
/* the rise and the morph: a soft start so the bar lifts off rather than jumps, then a long settle */
const morph = { duration: 0.56, ease: [0.45, 0, 0.15, 1] as const };
const smooth = { duration: 0.32, ease: easeInOut };
const glide = { duration: 0.24, ease };
const fade = { duration: 0.18, ease };

/* the rows' heights, for the room the card keeps: the bar rests in its middle and rises to its top, so opening it never moves the page */
const BAR_H = 50;
const HEAD_H = 40;
const ROW_H = 68;
const CHIPS_H = 64;
/* the open card's shadow reaches ~36px below it; keep that inside the room so nothing clips it */
const SHADOW_ROOM = 40;

/* ---------------------------------------------------------------- icons */

/* lucide: search, x, trash-2, rotate-ccw */
const Icon = ({ size, stroke = 2, children }: { size: number; stroke?: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);
const SearchIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </Icon>
);
const XIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);
const TrashIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);
const RestoreIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

/* ---------------------------------------------------------------- tiles */

/* each tile is drawn at 76px and shown at 44; the boxes are [left, top, width, height, radius, colour] */
type Box = [number, number, number, number, number | string, string];
const at = ([left, top, width, height, radius, background]: Box) => ({
  left,
  top,
  width,
  height,
  borderRadius: radius,
  background,
});

function Tile({ face, glow, children }: { face: string; glow: string; children: ReactNode }) {
  return (
    <div className="psearch__tile">
      <div
        className="psearch__tile-art"
        style={{ background: face, boxShadow: `inset 0 1px 1px rgba(255,255,255,.65), 0 6px 14px -6px ${glow}` }}
      >
        {children}
      </div>
    </div>
  );
}

function BrowseTile() {
  return (
    <Tile face="linear-gradient(140deg,#f6cffc 0%,#d79bf3 50%,#a75be6 100%)" glow="rgba(167,91,230,.55)">
      <span style={at([0, 13, 62, 63, "0 12px 0 0", "rgba(255,255,255,.45)"])} />
      <span style={at([32, 22, 24, 9, 999, "#a24de0"])} />
      <span style={at([5, 38, 24, 32, 5, "rgba(255,255,255,.6)"])} />
      <span style={at([33, 38, 22, 32, 5, "rgba(255,255,255,.45)"])} />
    </Tile>
  );
}

function GuideTile() {
  return (
    <Tile face="linear-gradient(150deg,#7cc0ff 0%,#3d8af5 55%,#2266e3 100%)" glow="rgba(34,102,227,.55)">
      <span className="psearch__window" style={at([12, 12, 64, 64, "10px 0 0 0", "#cfe7ff"])}>
        <span className="psearch__window-bar">
          <i />
          <i />
          <i />
        </span>
        <span className="psearch__window-line" style={{ marginTop: 12 }} />
        <span className="psearch__window-line" style={{ marginTop: 14 }} />
      </span>
    </Tile>
  );
}

function SettingsTile() {
  return (
    <Tile face="linear-gradient(150deg,#9ee98f 0%,#5cd062 55%,#38b54a 100%)" glow="rgba(56,181,74,.55)">
      <span className="psearch__switch psearch__switch--on" style={at([16, 16, 46, 22, 999, "rgba(255,255,255,.8)"])}>
        <i />
      </span>
      <span className="psearch__switch psearch__switch--off" style={at([16, 42, 46, 22, 999, "rgba(255,255,255,.55)"])}>
        <i />
      </span>
    </Tile>
  );
}

function FeedbackTile() {
  return (
    <Tile face="linear-gradient(150deg,#ffd28a 0%,#ffa25c 55%,#f47b36 100%)" glow="rgba(244,123,54,.55)">
      <span style={at([14, 18, 48, 34, 10, "rgba(255,255,255,.75)"])} />
      <span style={{ ...at([22, 48, 10, 10, 0, "rgba(255,255,255,.75)"]), rotate: "45deg" }} />
      <span style={at([22, 27, 30, 4, 999, "#f6914a"])} />
      <span style={at([22, 36, 20, 4, 999, "#f9b27c"])} />
    </Tile>
  );
}

type Item = { id: string; title: string; sub: string; Tile: () => ReactNode };
type Chip = { id: string; label: string; from: string; to: string };

const ALL_ITEMS: Item[] = [
  { id: "browse", title: "Browse & Discover", sub: "Search features, filters, bookmarks.", Tile: BrowseTile },
  { id: "guide", title: "Guided Tour & Tutorial", sub: "Account setup, onboarding, registration.", Tile: GuideTile },
  { id: "settings", title: "Settings & Preferences", sub: "Profiles, settings, dark-mode switch.", Tile: SettingsTile },
  { id: "feedback", title: "Feedback & Dialogs", sub: "Toasts, modals, confirmations.", Tile: FeedbackTile },
];

const ALL_CHIPS: Chip[] = [
  { id: "dialog", label: "Dialog", from: "#f7c76a", to: "#fbe0a4" },
  { id: "glass", label: "Glass", from: "#e2a6f1", to: "#f1cdf7" },
  { id: "components", label: "Components", from: "#a9e2a0", to: "#d4f2cd" },
];

/* ---------------------------------------------------------------- a recent row */

function RecentRow({
  item,
  index,
  active,
  hideDivider,
  onTrack,
  onRemove,
}: {
  item: Item;
  index: number;
  active: boolean;
  hideDivider: boolean;
  onTrack: (id: string, el: HTMLElement) => void;
  onRemove: (id: string) => void;
}) {
  const [tip, setTip] = useState(false);
  const isPresent = useIsPresent();

  useEffect(() => {
    if (!active) setTip(false);
  }, [active]);

  const track = (e: { currentTarget: HTMLElement }) => onTrack(item.id, e.currentTarget);

  return (
    <motion.li
      /* height only animates for rows added or removed while open; the first
         render skips it so the card is not resized under its own morph */
      initial={{ height: 0 }}
      animate={{ height: "auto", transition: smooth }}
      exit={{ height: 0, opacity: 0, transition: { height: smooth, opacity: { duration: 0.16, ease } } }}
      onPointerEnter={track}
      onFocus={track}
      className={`psearch__row${isPresent ? "" : " psearch__row--leaving"}`}
      style={{ zIndex: active ? 3 : 2 }}
    >
      <div className="psearch__divider" style={{ opacity: hideDivider ? 0 : 1 }} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.36, ease, delay: 0.1 + index * 0.045 } }}
        className="psearch__row-body"
      >
        <motion.div animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }} transition={glide}>
          <item.Tile />
        </motion.div>

        <div className="psearch__row-text">
          <div className="psearch__row-title">{item.title}</div>
          <div className="psearch__row-sub">{item.sub}</div>
        </div>

        <div className="psearch__remove-slot">
          <motion.button
            type="button"
            aria-label={`Remove ${item.title}`}
            initial={false}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : 6 }}
            transition={{ duration: 0.22, ease }}
            whileTap={{ scale: 0.88 }}
            onPointerEnter={() => setTip(true)}
            onPointerLeave={() => setTip(false)}
            onFocus={() => setTip(true)}
            onBlur={() => setTip(false)}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className={`psearch__remove${active ? "" : " psearch__remove--idle"}`}
          >
            <TrashIcon size={16} />
          </motion.button>

          <AnimatePresence>
            {tip && (
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, x: 4, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.18, ease, delay: 0.25 } }}
                exit={{ opacity: 0, x: 2, scale: 0.98, transition: { duration: 0.12, ease } }}
                style={{ originX: 1 }}
                className="psearch__tip"
              >
                Remove
                <span className="psearch__tip-arrow" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.li>
  );
}

/* ---------------------------------------------------------------- the list, with one sheet that glides between rows */

type Hover = { id: string; top: number; height: number; shown: boolean; jump: boolean };

function RecentList({
  items,
  visible,
  query,
  onRemove,
}: {
  items: Item[];
  visible: Item[];
  query: string;
  onRemove: (id: string) => void;
}) {
  /* jump = place the sheet without sliding, since it is invisible */
  const [hover, setHover] = useState<Hover | null>(null);

  const onTrack = (id: string, el: HTMLElement) => {
    const top = el.offsetTop;
    const height = el.offsetHeight;
    setHover((h) =>
      h && h.shown && h.id === id && h.top === top && h.height === height
        ? h
        : { id, top, height, shown: true, jump: !h || !h.shown },
    );
  };
  const hide = () => setHover((h) => (h && h.shown ? { ...h, shown: false, jump: false } : h));

  const shownId = hover?.shown && visible.some((i) => i.id === hover.id) ? hover.id : null;
  const activeIndex = visible.findIndex((i) => i.id === shownId);
  const still = { duration: 0 };

  return (
    <ul className="psearch__list" onPointerLeave={hide}>
      <motion.div
        aria-hidden
        className="psearch__sheet"
        initial={false}
        animate={{ y: hover?.top ?? 0, height: hover?.height ?? 0, opacity: shownId ? 1 : 0 }}
        transition={{
          y: hover?.jump ? still : glide,
          height: hover?.jump ? still : glide,
          opacity: fade,
        }}
      />

      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <RecentRow
            key={item.id}
            item={item}
            index={i}
            active={item.id === shownId}
            hideDivider={activeIndex !== -1 && (i === activeIndex || i === activeIndex + 1)}
            onTrack={onTrack}
            onRemove={(id) => {
              hide();
              onRemove(id);
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {visible.length === 0 && (
          <motion.li
            key="empty"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={smooth}
            className="psearch__empty"
          >
            <div>{items.length === 0 ? "No recent searches" : `No results for “${query.trim()}”`}</div>
          </motion.li>
        )}
      </AnimatePresence>
    </ul>
  );
}

/* ---------------------------------------------------------------- chips */

function CountBadge({ value }: { value: number }) {
  return (
    <span className="psearch__count">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={smooth}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Chips({ chips, setChips }: { chips: Chip[]; setChips: (next: Chip[] | ((list: Chip[]) => Chip[])) => void }) {
  return (
    <div className="psearch__chips">
      <motion.button
        layout
        type="button"
        transition={smooth}
        whileTap={{ scale: 0.96 }}
        onClick={() => setChips(ALL_CHIPS)}
        aria-label={`Categories, ${chips.length} selected. Restore all`}
        className="psearch__chip psearch__chip--lead"
      >
        <CountBadge value={chips.length} />
        Categories
      </motion.button>

      <AnimatePresence mode="popLayout" initial={false}>
        {chips.map((chip) => (
          <motion.div
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={smooth}
            className="psearch__chip"
            style={{ background: `linear-gradient(90deg,${chip.from} 0%,${chip.to} 100%)` }}
          >
            <motion.button
              type="button"
              aria-label={`Remove ${chip.label}`}
              whileTap={{ scale: 0.86 }}
              transition={smooth}
              onClick={() => setChips((list) => list.filter((c) => c.id !== chip.id))}
              className="psearch__chip-x"
            >
              <XIcon size={13} stroke={2.4} />
            </motion.button>
            {chip.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------- the card: a search bar that morphs open */

export default function SearchCard({ theme = "light", corner = 26, rows = 3, shortcut = true }: SearchCardProps) {
  const count = Math.max(0, Math.min(ALL_ITEMS.length, Math.round(rows)));
  const startItems = useMemo(() => ALL_ITEMS.slice(0, count), [count]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(startItems);
  const [chips, setChips] = useState(ALL_CHIPS);
  const [query, setQuery] = useState("");
  /* the hint is written for the platform once mounted, so the server and the first render agree */
  const [mac, setMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const radius = Math.max(0, Math.min(40, corner));
  const inner = Math.max(0, radius - 6);

  const q = query.trim().toLowerCase();
  const visible = q ? items.filter((i) => `${i.title} ${i.sub}`.toLowerCase().includes(q)) : items;

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    setItems(startItems);
  }, [startItems]);

  const close = () => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  /* ⌘K / Ctrl K toggles from anywhere */
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (document.activeElement === inputRef.current) close();
        else inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  /* a press outside folds it back into the bar */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (rootRef.current?.contains(target) || target?.closest?.("[data-keep-open]")) return;
      close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`psearch${open ? " psearch--open" : ""}`}
      data-theme={theme}
      style={{ minHeight: BAR_H + 12 + HEAD_H + ROW_H * count + 8 + CHIPS_H + SHADOW_ROOM }}
    >
      <motion.div
        layout
        layoutDependency={open}
        transition={morph}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => {
          if (!open) inputRef.current?.focus();
        }}
        className={`psearch__card${open ? " psearch__card--open" : ""}`}
        style={{ borderRadius: radius }}
      >
        {/* the search row: the one piece both shapes share */}
        <motion.div layout="position" layoutDependency={open} transition={morph} className="psearch__bar">
          <span className="psearch__glass">
            <SearchIcon size={17} stroke={2.2} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              if (query) setQuery("");
              else close();
            }}
            placeholder={open ? "UI Elements, Flows..." : "Search"}
            aria-label="Search"
            className="psearch__input"
          />

          <AnimatePresence mode="popLayout" initial={false}>
            {open ? (
              <motion.button
                key="close"
                type="button"
                aria-label={query ? "Clear search" : "Close"}
                initial={{ opacity: 0, scale: 0.7, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7, rotate: -45 }}
                transition={{ duration: 0.28, ease }}
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (query) {
                    setQuery("");
                    inputRef.current?.focus();
                  } else close();
                }}
                className="psearch__close"
              >
                <XIcon size={15} stroke={2.2} />
              </motion.button>
            ) : (
              <motion.kbd
                key="kbd"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={fade}
                className="psearch__kbd"
              >
                {mac ? "⌘K" : "Ctrl K"}
              </motion.kbd>
            )}
          </AnimatePresence>
        </motion.div>

        {/* everything else unfolds below the bar */}
        <AnimatePresence mode="popLayout" initial={false}>
          {open && (
            <motion.div
              key="body"
              layout="position"
              layoutDependency={open}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: 0.14 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
              className="psearch__body"
            >
              <div className="psearch__panel" style={{ borderRadius: inner }}>
                <div className="psearch__head">
                  <span className="psearch__head-label">Recent</span>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.button
                      key={items.length ? "clear" : "restore"}
                      type="button"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={smooth}
                      onClick={() => {
                        if (items.length) setItems([]);
                        else {
                          setItems(startItems);
                          setChips(ALL_CHIPS);
                          setQuery("");
                        }
                      }}
                      className="psearch__action"
                    >
                      {items.length ? (
                        "Clear all"
                      ) : (
                        <>
                          <RestoreIcon size={12} stroke={2.4} /> Restore
                        </>
                      )}
                    </motion.button>
                  </AnimatePresence>
                </div>

                <RecentList
                  items={items}
                  visible={visible}
                  query={query}
                  onRemove={(id) => setItems((list) => list.filter((x) => x.id !== id))}
                />
                <div className="psearch__foot" />
              </div>

              <Chips chips={chips} setChips={setChips} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
