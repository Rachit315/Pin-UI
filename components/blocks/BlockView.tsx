"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import BlocxMark from "./BlocxMark";
import BlocxFooter from "./BlocxFooter";
import GitHubStars from "../hero/GitHubStars";
import CodeBlock, { type CodePane } from "../library/CodeBlock";
import { useCopy } from "../library/useCopy";
import { useSaved } from "./useSaved";
import BlockDocs, { InstallPill, type BlockDocsMeta } from "./BlockDocs";
import type { BlockDocs as Docs } from "@/lib/blockDocs";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBlocks,
  IconBookmark,
  IconCheck,
  IconCode,
  IconCopy,
  IconEye,
  IconInfo,
  IconMaximize,
  IconMinimize,
  IconMonitor,
  IconPhone,
  IconRefresh,
  IconTablet,
} from "./icons";
import { SHELF_ORDER, blocksIn, categoryName, type Block } from "@/lib/blocks";
import { LINKS } from "@/lib/links";
import "./blocks.css";

/* the same motion vocabulary as the rest of Pin UI: one spring for every morph */
const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.14 };
const fade: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };

type Device = "desktop" | "tablet" | "phone";
/* the width each device lays the block out at, in CSS pixels */
const VIEWPORT: Record<Device, number> = { desktop: 1280, tablet: 768, phone: 390 };
const DEVICES: { id: Device; label: string; Icon: typeof IconMonitor }[] = [
  { id: "desktop", label: "Desktop", Icon: IconMonitor },
  { id: "tablet", label: "Tablet", Icon: IconTablet },
  { id: "phone", label: "Phone", Icon: IconPhone },
];

/**
 * A block's page: the sidebar of sections, and the block itself in a frame.
 *
 * The frame previews the block live, in an iframe laid out at a real device
 * width — 1280, 768 or 390 — and scaled to fit, so what you see at "desktop"
 * is the desktop layout, not a squeezed one. The Code tab holds its source;
 * Copy for AI puts the whole thing on the clipboard with instructions for an
 * assistant; the bookmark keeps it on your shelf; the frame can fill the
 * screen; and refresh plays the block's entrance again.
 */
export default function BlockView({
  block,
  panes,
  docs,
  meta,
  stats,
}: {
  block: Block;
  panes: CodePane[];
  /** Left out for a block whose docs have not been written: the page is then the preview alone. */
  docs?: Docs;
  meta: BlockDocsMeta;
  stats: { blocks: number; sections: number };
}) {
  const reduced = useReducedMotion();
  const group = useId();
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [expanded, setExpanded] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [info, setInfo] = useState(false);
  /* while the frame is lifted into full screen, its slot keeps its height so the page does not jump */
  const holdRef = useRef<HTMLDivElement>(null);
  const [holdH, setHoldH] = useState<number | null>(null);
  const toggleExpanded = () => {
    if (!expanded) setHoldH(holdRef.current?.offsetHeight ?? null);
    setExpanded((e) => !e);
  };
  const { state: aiState, copy } = useCopy();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(block.slug);

  /* on a small screen the block opens at the width you are holding, not scaled down from a desktop */
  useEffect(() => {
    const w = window.innerWidth;
    if (w < 700) setDevice("phone");
    else if (w < 1000) setDevice("tablet");
  }, []);

  /* full screen: Escape leaves it, and the page behind does not scroll */
  useEffect(() => {
    if (!expanded) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && setExpanded(false);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [expanded]);

  const reload = () => {
    setLoaded(false);
    setReloads((n) => n + 1);
  };

  const copyForAI = () => {
    const files = panes.map((p) => `--- ${p.name} ---\n${p.code.trimEnd()}`).join("\n\n");
    const prompt = [
      `Add the "${block.name}" block from Pin UI's Blocx library to my project.`,
      ``,
      `Section: ${categoryName(block.category)}. Stack: ${block.stack}.`,
      block.note,
      ``,
      `Create the files below exactly as written, keeping the stylesheet next to the component it belongs to, then render the component where this section should sit on the page. Keep the class names, the colours and the responsive rules as they are; if the project uses a different folder layout, only adjust the import paths.`,
      `Images live under public/blocx/${block.slug}/ in Pin UI; copy them into the same path in public/ (or change the paths at the top of the component).`,
      ``,
      files,
    ]
      .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
      .join("\n");
    void copy(prompt, null);
  };

  return (
    <div className="blx blx--block">
      <LayoutGroup id={`blx-${group}`}>
        <Sidebar block={block} />

        <main className="blx-main">
          <div className="blx-topbar">
            <Link className="blx-back" href="/blocx">
              <IconArrowLeft />
              Back to Blocx
            </Link>
            <GitHubStars />
          </div>

          {/* --- the head: where it sits, what it is, and the one line that installs it --- */}
          <header className="blx-pagehead">
            <nav className="blx-crumbs" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/blocx">Blocx</Link>
                </li>
                <li aria-hidden="true" className="blx-crumbs__sep">
                  <Chevron />
                </li>
                <li>
                  <span>{categoryName(block.category)}</span>
                </li>
                <li aria-hidden="true" className="blx-crumbs__sep">
                  <Chevron />
                </li>
                <li aria-current="page">{block.name}</li>
              </ol>
            </nav>
            <h1 className="blx-pagehead__title">
              {block.name}
              {block.isNew && <span className="blx-pagehead__new">New</span>}
            </h1>
            <p className="blx-pagehead__lead">{block.summary}</p>
            <InstallPill url={meta.registryUrl} />
          </header>

          <div
            className="blx-frameHold"
            ref={holdRef}
            data-expanded={expanded || undefined}
            style={expanded && holdH ? { height: holdH } : undefined}
          >
            <AnimatePresence>
              {expanded && (
                <motion.div
                  className="blx-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                  onClick={() => setExpanded(false)}
                />
              )}
            </AnimatePresence>

            <motion.section
              className="blx-frame"
              data-expanded={expanded || undefined}
              layout
              transition={reduced ? { duration: 0 } : morph}
              aria-label={`${block.name} — preview`}
            >
              {/* --- the bar ------------------------------------------------------- */}
              <motion.div className="blx-bar" layout="position" transition={reduced ? { duration: 0 } : morph}>
                <div className="blx-bar__left">
                  <div className="blx-tabs" role="tablist" aria-label="View">
                    {(
                      [
                        { id: "preview", label: "Preview", Icon: IconEye },
                        { id: "code", label: "Code", Icon: IconCode },
                      ] as const
                    ).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        className="blx-tab"
                        data-on={tab === id || undefined}
                        onClick={() => setTab(id)}
                      >
                        {tab === id && <motion.span layoutId="blx-tab-on" className="blx-tab__on" transition={morph} />}
                        <Icon />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="blx-info">
                    <button
                      type="button"
                      className="blx-info__btn"
                      aria-label="About this block"
                      aria-expanded={info}
                      onClick={() => setInfo((o) => !o)}
                    >
                      <IconInfo />
                    </button>
                    <InfoPanel open={info} block={block} onClose={() => setInfo(false)} />
                  </div>
                </div>

                <div className="blx-bar__right">
                  {/* what you can do with the block: open it alone, take it, keep it */}
                  <div className="blx-bar__actions">
                  {/* the block on its own, full window, in a new tab */}
                  <a
                    className="blx-tool blx-tool--wide blx-tool--live"
                    href={`/blocx/preview/${block.slug}`}
                    target="_blank"
                    rel="noopener"
                    title="Open the block on its own, full window"
                  >
                    <span className="blx-tool__face">
                      Live preview
                      <IconArrowUpRight />
                    </span>
                  </a>

                  <motion.button
                    type="button"
                    className="blx-tool blx-tool--wide"
                    onClick={copyForAI}
                    whileTap={reduced ? undefined : { scale: 0.95 }}
                    data-done={aiState === "done" || undefined}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={aiState}
                        className="blx-tool__face"
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(3px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
                        transition={{ ...morph, opacity: fade, filter: fade }}
                      >
                        {aiState === "done" ? (
                          <>
                            Copied <IconCheck />
                          </>
                        ) : aiState === "failed" ? (
                          <>Copy blocked</>
                        ) : (
                          <>
                            Copy for AI <IconCopy />
                          </>
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>

                  <motion.button
                    type="button"
                    className="blx-tool"
                    aria-label={saved ? "Remove the bookmark" : "Bookmark this block"}
                    aria-pressed={saved}
                    data-on={saved || undefined}
                    onClick={() => toggle(block.slug)}
                    whileTap={reduced ? undefined : { scale: 0.88 }}
                  >
                    <motion.span
                      key={saved ? "on" : "off"}
                      className="blx-tool__icon"
                      initial={reduced || !saved ? false : { scale: 0.4, rotate: -14 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 16 }}
                    >
                      <IconBookmark filled={saved} />
                    </motion.span>
                  </motion.button>
                  </div>

                  {/* how you see it: the width it is laid out at, full screen, and again */}
                  <div className="blx-bar__view">
                  <div className="blx-devices" role="radiogroup" aria-label="Device width">
                    {DEVICES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={device === id}
                        aria-label={`${label} — ${VIEWPORT[id]}px`}
                        title={`${label} · ${VIEWPORT[id]}px`}
                        className="blx-tool"
                        data-on={device === id || undefined}
                        onClick={() => {
                          setDevice(id);
                          setTab("preview");
                        }}
                      >
                        <Icon />
                      </button>
                    ))}
                  </div>

                  <div className="blx-devices">
                    <button
                      type="button"
                      className="blx-tool"
                      aria-label={expanded ? "Leave full screen" : "Full screen"}
                      title={expanded ? "Leave full screen (Esc)" : "Full screen"}
                      onClick={toggleExpanded}
                    >
                      {expanded ? <IconMinimize /> : <IconMaximize />}
                    </button>
                    <motion.button
                      type="button"
                      className="blx-tool"
                      aria-label="Reload the preview"
                      title="Reload the preview"
                      onClick={() => {
                        setTab("preview");
                        reload();
                      }}
                    >
                      <motion.span
                        className="blx-tool__icon"
                        animate={{ rotate: reduced ? 0 : reloads * 360 }}
                        transition={{ type: "spring", stiffness: 160, damping: 20 }}
                      >
                        <IconRefresh />
                      </motion.span>
                    </motion.button>
                  </div>
                  </div>
                </div>
              </motion.div>

              {/* --- the body: the live block, or its source ------------------------ */}
              <div className="blx-body">
                <Stage
                  hidden={tab !== "preview"}
                  block={block}
                  device={device}
                  reloads={reloads}
                  loaded={loaded}
                  onLoaded={() => setLoaded(true)}
                />
                <AnimatePresence initial={false}>
                  {tab === "code" && (
                    <motion.div
                      key="code"
                      className="blx-code"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
                      transition={{ ...morph, opacity: fade, filter: fade }}
                    >
                      <CodeBlock label={block.slug} panes={panes} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          </div>

          {docs && <BlockDocs block={block} docs={docs} meta={meta} panes={panes} stats={stats} />}
        </main>
      </LayoutGroup>

      <BlocxFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- stage -- */

/*
 * The live block: an iframe at the device's real width, scaled to fit the
 * frame. At desktop it fills the frame edge to edge; at tablet and phone it
 * stands in the middle as a device would, and the change of width eases.
 */
function Stage({
  hidden,
  block,
  device,
  reloads,
  loaded,
  onLoaded,
}: {
  hidden: boolean;
  block: Block;
  device: Device;
  reloads: number;
  loaded: boolean;
  onLoaded: () => void;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const vw = VIEWPORT[device];
  const pad = device === "desktop" ? 0 : 20;
  const scale = box.w ? Math.min(1, (box.w - pad * 2) / vw) : 1;
  const frameW = Math.round(vw * scale);
  const frameH = Math.max(0, box.h - pad * 2);
  const vh = scale ? frameH / scale : frameH;

  return (
    <div className="blx-stage" ref={ref} data-device={device} hidden={hidden} aria-hidden={hidden}>
      {box.w > 0 && (
        <motion.div
          className="blx-device"
          data-device={device}
          initial={false}
          animate={{ width: frameW, height: frameH }}
          transition={reduced ? { duration: 0 } : morph}
          style={{ background: block.canvas }}
        >
          <iframe
            key={reloads}
            className="blx-iframe"
            src={`/blocx/preview/${block.slug}`}
            title={`${block.name} — live preview`}
            onLoad={onLoaded}
            style={{ width: vw, height: vh, transform: `scale(${scale})` }}
          />
          <AnimatePresence>
            {!loaded && (
              <motion.span
                key="loading"
                className="blx-loading"
                style={{ background: block.canvas }}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <span className="blx-loading__bar" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- info -- */

function InfoPanel({ open, block, onClose }: { open: boolean; block: Block; onClose: () => void }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const host = ref.current?.parentElement;
      if (host && !host.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  const rows: [string, string][] = [
    ["Section", categoryName(block.category)],
    ["Stack", block.stack],
    ["Widths", "Desktop · Tablet · Phone"],
    ["Files", String(block.files.length)],
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="blx-infoPanel"
          role="dialog"
          aria-label={`About ${block.name}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97, filter: "blur(6px)" }}
          transition={{ ...morph, opacity: fade, filter: fade }}
        >
          <p className="blx-infoPanel__name">{block.name}</p>
          <p className="blx-infoPanel__note">{block.note}</p>
          <dl className="blx-infoPanel__rows">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {/* where it came from: its own pin when one was recorded, the Pin UI board otherwise */}
            <div>
              <dt>Inspiration</dt>
              <dd>
                <a className="blx-infoPanel__link" href={block.pin ?? LINKS.pinterest} target="_blank" rel="noopener noreferrer">
                  Pinterest
                  <IconArrowUpRight />
                </a>
              </dd>
            </div>
          </dl>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------- sidebar -- */

/* the sections that hold blocks, in the shelf's own order */
const SECTIONS = SHELF_ORDER.map((id) => ({ id, name: categoryName(id), blocks: blocksIn(id) })).filter((s) => s.blocks.length);

/*
 * The sections that hold blocks, in the shelf's order, each with how many it
 * holds. Every section is a disclosure: its row opens and closes its list of
 * blocks right there — it never leaves the page — and any number can be open
 * at once. The section of the block in view starts open and wears the mark;
 * one highlight follows the pointer down the rows. On a narrow screen the
 * panel folds behind a button that says where you are.
 */
function Sidebar({ block }: { block: Block }) {
  const reduced = useReducedMotion();
  const panelId = useId();
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([block.category]));
  const onLeave = useCallback(() => setHover(null), []);

  /* moving to a block in another section opens that section too */
  useEffect(() => {
    setExpanded((prev) => (prev.has(block.category) ? prev : new Set(prev).add(block.category)));
  }, [block.category]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="blx-side">
      <div className="blx-side__mark">
        <BlocxMark size="md" />
      </div>

      <button
        type="button"
        className="blx-side__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <IconBlocks />
        <span className="blx-side__where">
          {categoryName(block.category)}
          <span aria-hidden="true"> / </span>
          <b>{block.name}</b>
        </span>
        <motion.span className="blx-side__chev" animate={{ rotate: open ? 180 : 0 }} transition={morph} aria-hidden="true">
          <Chevron />
        </motion.span>
      </button>

      <nav id={panelId} className="blx-panel" data-open={open || undefined} aria-label="Blocx">
        <Link className="blx-panel__home" href="/blocx">
          <span className="blx-panel__homeIcon">
            <IconBlocks />
          </span>
          All Blocx
        </Link>

        <p className="blx-panel__label">
          Sections <span>{SECTIONS.length}</span>
        </p>

        <ul className="blx-panel__list" onPointerLeave={onLeave}>
          {SECTIONS.map((section) => {
            const current = section.id === block.category;
            const isOpen = expanded.has(section.id);
            const listId = `${panelId}-${section.id}`;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className="blx-panel__item"
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  data-current={current || undefined}
                  onClick={() => toggle(section.id)}
                  onPointerEnter={() => setHover(section.id)}
                  onFocus={() => setHover(section.id)}
                >
                  {hover === section.id && !current && (
                    <motion.span layoutId="blx-side-hover" className="blx-panel__hover" transition={morph} />
                  )}
                  {current && <motion.span layoutId="blx-side-on" className="blx-panel__on" transition={morph} />}
                  <span className="blx-panel__name">{section.name}</span>
                  <span className="blx-panel__count">{section.blocks.length}</span>
                  <motion.span
                    className="blx-panel__chev"
                    initial={false}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={reduced ? { duration: 0 } : morph}
                    aria-hidden="true"
                  >
                    <Chevron />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      id={listId}
                      className="blx-panel__sub"
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ ...morph, opacity: fade }}
                    >
                      {section.blocks.map((b) => (
                        <li key={b.slug}>
                          <Link
                            className="blx-panel__subItem"
                            href={`/blocx/${b.slug}`}
                            aria-current={b.slug === block.slug ? "page" : undefined}
                            onClick={() => setOpen(false)}
                          >
                            <span className="blx-panel__subDot" aria-hidden="true" />
                            <span className="blx-panel__subName">{b.name}</span>
                            {b.isNew && <span className="blx-panel__new">New</span>}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" fill="none">
      <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
