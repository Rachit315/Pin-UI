"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { animate, AnimatePresence, motion, MotionConfig, useReducedMotion, type Variants } from "motion/react";
import { GeistSans } from "geist/font/sans";
import "./partylabs-hero.css";

/**
 * iPartyLabs Hero — a thesis floating in a 3-D field of party photos.
 *
 * One viewport: a glass nav with a search pill, a centred badge, headline and
 * two calls to action, and around them about thirty photos hand-placed at five
 * depths. Depth drives everything — size, blur, saturation, opacity, shadow and
 * how far a photo shifts as the pointer moves — so the field reads as space,
 * not a collage. On arrival the photos fly outward from the headline into
 * place and keep drifting; the headline blurs in a word at a time. The search
 * cycles through suggestions and "/" focuses it; on a phone the nav folds into
 * a sheet. Each breakpoint has its own hand-placed layout.
 *
 * Photos: Unsplash License, shipped in /blocx/partylabs-hero.
 */

/* Geist ships with the `geist` package and loads from local files, so nothing is fetched from Google at build time */

const EASE = [0.22, 1, 0.36, 1] as const;
const PHOTO_DIR = "/blocx/partylabs-hero";

/* ---------- hand-placed layouts: [x%, y%, depth 0..1, rotation°, portrait?] ---------- */

type Spot = [number, number, number, number, 1?];
type Layout = { u: number; max: number; cards: Spot[] };
type LayoutName = "desktop" | "tablet" | "mobile";

const LAYOUTS: Record<LayoutName, Layout> = {
  desktop: {
    u: 0.092,
    max: 150,
    cards: [
      [15, 6, 0.5, -12], [8, 26, 1, 8], [25, 20, 0.8, 15], [42, 22, 0.28, -10, 1], [59, 6, 0.32, 10],
      [70, 18, 0.6, -14], [83, 27, 0.85, -10], [98, 27, 1, -12], [94, 4, 0.5, 10], [19, 42, 0.3, 6],
      [5, 50, 0.9, 4], [20, 66, 0.42, 8], [7, 74, 0.75, -15], [39, 82, 0.3, -18, 1], [27, 88, 0.55, 10],
      [12, 96, 0.3, -12], [53, 92, 0.36, 0, 1], [64, 82, 0.5, 15], [81, 82, 0.72, -10], [87, 59, 0.85, 8],
      [88, 36, 0.68, -6], [99, 51, 0.9, 12, 1], [97, 75, 0.8, 10], [74, 66, 0.26, -12], [76, 40, 0.26, 8],
      [91, 95, 0.42, -10], [68, 98, 0.3, 8, 1],
    ],
  },
  tablet: {
    u: 0.15,
    max: 140,
    cards: [
      [10, 15, 0.9, -10], [30, 12, 0.38, 8, 1], [52, 19, 0.58, -6], [74, 13, 0.85, 12], [94, 25, 0.7, -8],
      [20, 29, 0.42, 10], [80, 32, 0.38, -12, 1], [4, 45, 0.58, 6], [97, 50, 0.58, -8], [6, 63, 0.4, -10, 1],
      [12, 79, 0.85, 10], [33, 73, 0.33, -8], [51, 87, 0.58, 6, 1], [70, 76, 0.4, 12], [88, 83, 0.9, -10],
      [28, 94, 0.5, -6], [78, 96, 0.44, 8], [96, 67, 0.33, 10],
    ],
  },
  mobile: {
    u: 0.27,
    max: 130,
    cards: [
      [14, 15, 0.85, -10], [45, 12, 0.38, 8, 1], [82, 15, 0.9, 10], [28, 27, 0.48, 6], [66, 28, 0.52, -12],
      [97, 31, 0.33, 8], [3, 31, 0.33, -8, 1], [12, 77, 0.85, 10], [48, 79, 0.38, -8, 1], [85, 76, 0.8, -10],
      [30, 91, 0.52, 8], [70, 93, 0.58, 10], [97, 89, 0.33, -6],
    ],
  },
};

/* the photos, best first: the nearest, sharpest cards get the top of the list (p = portrait) */
const PHOTOS: { src: string; p: boolean }[] = (
  [
    [10, 0], [13, 1], [14, 0], [22, 0], [12, 1], [18, 0], [28, 1], [5, 0], [25, 1], [4, 0],
    [7, 0], [23, 1], [16, 0], [30, 0], [17, 1], [20, 0], [2, 0], [15, 1], [24, 0], [11, 0],
    [26, 1], [6, 0], [19, 1], [27, 0], [29, 0], [9, 1], [1, 0], [8, 1], [3, 0], [21, 0],
  ] as const
).map(([n, p]) => ({ src: `${PHOTO_DIR}/${String(n).padStart(2, "0")}.webp`, p: p === 1 }));

/* nearest cards first; each takes the best unused photo of its own orientation */
function assignPhotos(cards: Spot[]): string[] {
  const used = new Set<number>();
  const out: string[] = [];
  cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c[2] - a.c[2])
    .forEach(({ c, i }) => {
      const want = c[4] === 1;
      let pick = PHOTOS.findIndex((ph, k) => !used.has(k) && ph.p === want);
      if (pick < 0) pick = PHOTOS.findIndex((_, k) => !used.has(k));
      used.add(pick);
      out[i] = PHOTOS[pick].src;
    });
  return out;
}

function pickLayout(w: number, h: number): LayoutName {
  if (w < 640) return "mobile";
  if (w < 1024 || h > w * 1.05) return "tablet";
  return "desktop";
}

const IDEAS = ["rooftop bars in Bandra", "birthday venues for 30", "live music tonight", "private dining rooms", "sundowners by the sea"];

const reveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE, delay } }),
};
const fromTop: Variants = {
  hidden: { opacity: 0, y: -10 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay } }),
};

const TITLE = "Connecting you to experiences";

/* ------------------------------------------------------------------ */

function BrandMark() {
  return (
    <span className="plh-brand__mark" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Search({ id, idea, kbd }: { id: string; idea: number; kbd?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <form className={`plh-search${value ? " is-filled" : ""}`} role="search" onSubmit={(e) => e.preventDefault()}>
      <SearchIcon />
      <label className="plh-sr" htmlFor={id}>
        Search venues and experiences
      </label>
      <div className="plh-search__field">
        <input id={id} name="q" type="search" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="plh-search__hint" aria-hidden>
          <b>Try</b>
          <span className="plh-search__words">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={idea}
                className="plh-search__word"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {IDEAS[idea]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </div>
      {kbd && (
        <span className="plh-kbd" aria-hidden>
          /
        </span>
      )}
    </form>
  );
}

export default function PartylabsHero() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutName | null>(null);
  const [idea, setIdea] = useState(0);
  const [sheet, setSheet] = useState(false);
  const firstBuild = useRef(true);

  /* which hand-placed layout, and the size unit the cards are drawn in */
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const field = fieldRef.current;
    if (!hero || !field) return;
    let t = 0;
    const fit = () => {
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      const name = pickLayout(w, h);
      const L = LAYOUTS[name];
      const unit = Math.min(w * L.u, L.max) * Math.max(0.72, Math.min(1.1, h / 860));
      field.style.setProperty("--plh-unit", `${unit.toFixed(1)}px`);
      setLayout(name);
    };
    fit();
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(fit, 120);
    });
    ro.observe(hero);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  const cards = useMemo(() => {
    if (!layout) return [];
    const L = LAYOUTS[layout];
    const photos = assignPhotos(L.cards);
    // nearest the headline first, so the entrance ripples outward from it
    return L.cards
      .map((c, i) => ({ c, i, src: photos[i], dist: Math.hypot(c[0] - 50, (c[1] - 50) * 1.3) }))
      .sort((a, b) => a.dist - b.dist)
      .map((o, order) => ({ ...o, order }));
  }, [layout]);

  /* the photos fly outward from the headline into place */
  useEffect(() => {
    const field = fieldRef.current;
    if (!field || !cards.length || reduce) return;
    const first = firstBuild.current;
    firstBuild.current = false;
    const w = field.clientWidth;
    const h = field.clientHeight;
    const controls = Array.from(field.querySelectorAll<HTMLElement>(".plh-photo")).map((el) => {
      const x = +el.dataset.x!;
      const y = +el.dataset.y!;
      const order = +el.dataset.order!;
      return animate(
        el,
        {
          opacity: [0, 1],
          scale: [0.55, 1],
          x: [(((50 - x) * 0.6 * w) / 100) * 0.35, 0],
          y: [(((50 - y) * 0.6 * h) / 100) * 0.35, 0],
          filter: ["blur(10px)", "blur(0px)"],
        },
        { duration: first ? 1.4 : 0.8, delay: (first ? 0.35 : 0) + order * 0.035, ease: EASE },
      );
    });
    return () => controls.forEach((c) => c.stop());
  }, [cards, reduce]);

  /* pointer parallax: one rAF loop easing toward the pointer */
  useEffect(() => {
    const field = fieldRef.current;
    if (!field || reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0;
    let ty = 0;
    let mx = 0;
    let my = 0;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = field.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const leave = () => {
      tx = 0;
      ty = 0;
    };
    const loop = () => {
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      field.style.setProperty("--plh-mx", mx.toFixed(4));
      field.style.setProperty("--plh-my", my.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  /* the search suggestions cycle */
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setIdea((i) => (i + 1) % IDEAS.length), 2800);
    return () => clearInterval(t);
  }, [reduce]);

  /* "/" focuses the search, Escape closes the sheet */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        if ((heroRef.current?.clientWidth ?? innerWidth) >= 768) document.getElementById("plh-q")?.focus();
        else {
          setSheet(true);
          requestAnimationFrame(() => document.getElementById("plh-q2")?.focus());
        }
      }
      if (e.key === "Escape") setSheet(false);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);

  /* a press outside the sheet closes it */
  useEffect(() => {
    if (!sheet) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!sheetRef.current?.contains(t) && !menuRef.current?.contains(t)) setSheet(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [sheet]);

  return (
    <MotionConfig reducedMotion="user">
      <main ref={heroRef} className={`plh ${GeistSans.variable}`} id="plh-top">
        <div ref={fieldRef} className="plh-field" aria-hidden>
          {cards.map(({ c, i, src, order }) => {
            const [x, y, d, r, p] = c;
            const portrait = p === 1;
            const style = {
              "--x": `${x}%`,
              "--y": `${y}%`,
              "--d": d,
              "--r": `${r}deg`,
              "--ar": portrait ? "3 / 4" : "4 / 3",
              "--o": (0.28 + d * 0.72).toFixed(2),
              "--b": `${d < 0.6 ? ((0.6 - d) * 6).toFixed(1) : 0}px`,
              "--s": (0.55 + d * 0.5).toFixed(2),
              "--z": Math.round(d * 10),
              "--dur": `${7 + (i % 5) * 1.3}s`,
              "--delay": `-${(i * 0.7).toFixed(1)}s`,
              "--amp": `${(4 + d * 7).toFixed(1)}px`,
              "--w": `calc(var(--plh-unit) * ${((0.55 + d * 0.65) * (portrait ? 0.82 : 1)).toFixed(3)})`,
            } as CSSProperties;
            return (
              <div key={`${layout}-${i}`} className={`plh-card${d > 0.65 ? " is-near" : ""}`} style={style}>
                <div className="plh-float">
                  <div
                    className="plh-photo"
                    data-x={x}
                    data-y={y}
                    data-order={order}
                    style={reduce ? undefined : { opacity: 0 }}
                  >
                    <img alt="" src={src} decoding="async" draggable={false} fetchPriority={d > 0.65 ? "high" : "auto"} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <header className="plh-nav">
          <motion.a
            className="plh-brand"
            href="#plh-top"
            aria-label="iPartyLabs home"
            variants={fromTop}
            initial="hidden"
            animate="show"
            custom={0.45}
            onClick={(e) => e.preventDefault()}
          >
            <BrandMark />
            iPartyLabs
          </motion.a>

          <motion.div className="plh-nav__search" variants={fromTop} initial="hidden" animate="show" custom={0.5}>
            <Search id="plh-q" idea={idea} kbd />
          </motion.div>

          <nav className="plh-nav__right" aria-label="Primary">
            {["Home", "Partner"].map((label, i) => (
              <motion.a
                key={label}
                className="plh-nav__link"
                href="#plh-top"
                aria-current={i === 0 ? "page" : undefined}
                variants={fromTop}
                initial="hidden"
                animate="show"
                custom={0.55 + i * 0.05}
                onClick={(e) => e.preventDefault()}
              >
                {label}
              </motion.a>
            ))}
            <motion.button className="plh-icon" type="button" aria-label="Cart" variants={fromTop} initial="hidden" animate="show" custom={0.65}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" />
                <circle cx="9.5" cy="20" r="1.2" />
                <circle cx="17" cy="20" r="1.2" />
              </svg>
            </motion.button>
            <motion.button className="plh-btn plh-btn--dark plh-btn--sm" type="button" variants={fromTop} initial="hidden" animate="show" custom={0.7}>
              Logout
            </motion.button>
            <motion.button
              ref={menuRef}
              className="plh-icon plh-menu"
              type="button"
              aria-label={sheet ? "Close menu" : "Open menu"}
              aria-expanded={sheet}
              aria-controls="plh-sheet"
              onClick={() => setSheet((s) => !s)}
              variants={fromTop}
              initial="hidden"
              animate="show"
              custom={0.5}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <motion.path d="M4 8h16" animate={sheet ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }} style={{ transformOrigin: "center", transformBox: "fill-box" }} />
                <motion.path d="M4 16h16" animate={sheet ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }} style={{ transformOrigin: "center", transformBox: "fill-box" }} />
              </svg>
            </motion.button>
          </nav>
        </header>

        <AnimatePresence>
          {sheet && (
            <motion.div
              ref={sheetRef}
              id="plh-sheet"
              className="plh-sheet"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Search id="plh-q2" idea={idea} />
              <a href="#plh-top" aria-current="page" onClick={(e) => e.preventDefault()}>
                Home
              </a>
              <a href="#plh-top" onClick={(e) => e.preventDefault()}>
                Partner
              </a>
              <button className="plh-btn plh-btn--dark" type="button">
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="plh-content" aria-labelledby="plh-title">
          <motion.a
            className="plh-badge"
            href="#plh-top"
            onClick={(e) => e.preventDefault()}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          >
            <span className="plh-badge__icon" aria-hidden>
              <span>
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            Announcing our Launch
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </motion.a>

          <h1 id="plh-title" className="plh-title" aria-label={TITLE}>
            {TITLE.split(" ").map((w, i) => (
              <motion.span
                key={i}
                className="plh-title__w"
                aria-hidden
                initial={{ opacity: 0, y: "0.45em", filter: "blur(12px)" }}
                animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.08 }}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <div className="plh-ctas">
            <motion.a className="plh-btn plh-btn--dark" href="#plh-top" variants={reveal} initial="hidden" animate="show" custom={0.6} onClick={(e) => e.preventDefault()}>
              Browse Venues
              <svg className="plh-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </motion.a>
            <motion.a className="plh-btn plh-btn--light" href="#plh-top" variants={reveal} initial="hidden" animate="show" custom={0.68} onClick={(e) => e.preventDefault()}>
              Contact Us
            </motion.a>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}
