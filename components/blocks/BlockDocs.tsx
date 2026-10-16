"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import CodeBlock, { type CodePane } from "../library/CodeBlock";
import { useCopy } from "../library/useCopy";
import { IconCheck, IconCopy } from "./icons";
import type { BlockDocs as Docs } from "@/lib/blockDocs";
import type { Block } from "@/lib/blocks";

/**
 * A block's written half, under the preview: when to use it and when not to,
 * how to install it (the CLI or by hand), a usage example, its props, and how
 * it behaves for keyboards, motion and small screens.
 *
 * The packages and assets it lists are read off the block at build time and
 * handed in as `meta`, so they always match the code.
 */

const morph: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.14 };
const swap: Transition = { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] };

export type BlockDocsMeta = {
  dependencies: string[];
  usesNext: boolean;
  assets: string[];
  registryUrl: string;
  installDir: string;
};

type Manager = { id: string; run: string; add: string };
const MANAGERS: Manager[] = [
  { id: "pnpm", run: "pnpm dlx", add: "pnpm add" },
  { id: "npm", run: "npx", add: "npm install" },
  { id: "yarn", run: "yarn dlx", add: "yarn add" },
  { id: "bun", run: "bunx --bun", add: "bun add" },
];

/* ------------------------------------------------------------- pieces -- */

/** A copy button whose face swaps to a check once the text is on the clipboard. */
export function CopyButton({ text, label, compact }: { text: string; label: string; compact?: boolean }) {
  const reduced = useReducedMotion();
  const { state, copy } = useCopy();
  return (
    <button type="button" className={`blx-copy${compact ? " blx-copy--compact" : ""}`} aria-label={label} onClick={() => copy(text, null)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          className="blx-copy__face"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
          transition={swap}
        >
          {state === "done" ? <IconCheck /> : <IconCopy />}
          {!compact && (state === "done" ? "Copied" : state === "failed" ? "Press ⌘C" : "Copy")}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** Underlined tabs with one rule that glides between them. */
function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  small,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  small?: boolean;
}) {
  const reduced = useReducedMotion();
  const group = useId();
  return (
    <div className={`blx-dtabs${small ? " blx-dtabs--small" : ""}`} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className="blx-dtab"
          data-on={value === item.id || undefined}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {value === item.id && (
            <motion.span className="blx-dtab__rule" layoutId={reduced ? undefined : `blx-dtab-${group}`} transition={morph} />
          )}
        </button>
      ))}
    </div>
  );
}

/** A one-line command, in a box with the package managers as tabs. */
function CommandBox({ build }: { build: (m: Manager) => string }) {
  const [pm, setPm] = useState(MANAGERS[0].id);
  const manager = MANAGERS.find((m) => m.id === pm) ?? MANAGERS[0];
  const command = build(manager);
  return (
    <div className="blx-cmd">
      <div className="blx-cmd__bar">
        <Tabs small label="Package manager" items={MANAGERS.map((m) => ({ id: m.id, label: m.id }))} value={pm} onChange={setPm} />
        <CopyButton text={command} label="Copy the command" />
      </div>
      <pre className="blx-cmd__line" tabIndex={0}>
        <code>{command}</code>
      </pre>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="blx-doc__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className="blx-doc__section"
      aria-labelledby={id}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 id={id} className="blx-doc__h">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/* --------------------------------------------------------------- docs -- */

export default function BlockDocs({
  block,
  docs,
  meta,
  panes,
  stats,
}: {
  block: Block;
  docs: Docs;
  meta: BlockDocsMeta;
  panes: CodePane[];
  stats: { blocks: number; sections: number };
}) {
  const [mode, setMode] = useState<"cli" | "manual">("cli");
  const sid = useId();
  const id = (s: string) => `${sid}-${s}`;
  const images = meta.assets.filter((a) => !a.endsWith(".svg"));
  const assetDir = `public/blocx/${block.slug}/`;

  /* the usage example, as a page someone could paste */
  const multiline = docs.usage.includes("\n");
  const body = multiline
    ? `  return (\n${docs.usage
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n  );`
    : `  return ${docs.usage};`;
  const example: CodePane = {
    name: "page.tsx",
    lang: "tsx",
    code: `import ${docs.component} from "@/${meta.installDir}/${docs.file}";\n\nexport default function Page() {\n${body}\n}\n`,
  };

  const requirements = [
    "React 19",
    meta.usesNext ? "Next.js (it loads its fonts with next/font)" : null,
    ...meta.dependencies,
  ].filter(Boolean) as string[];

  return (
    <div className="blx-doc">
      <Section id={id("use")} title="When to use">
        <List items={docs.use} />
      </Section>

      <Section id={id("avoid")} title="When not to use">
        <List items={docs.avoid} />
      </Section>

      <Section id={id("install")} title="Installation">
        <p className="blx-doc__p">
          Add {block.name} with the shadcn CLI — it writes the files into <code>{meta.installDir}/</code> and installs what
          they import — or copy it in by hand.
        </p>
        <p className="blx-doc__req">Requires {requirements.join(" · ")}.</p>

        <Tabs
          label="How to install"
          items={[
            { id: "cli", label: "CLI" },
            { id: "manual", label: "Manual" },
          ]}
          value={mode}
          onChange={setMode}
        />

        <AnimatePresence mode="wait" initial={false}>
          {mode === "cli" ? (
            <motion.div
              key="cli"
              className="blx-doc__pane"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={swap}
            >
              <CommandBox build={(m) => `${m.run} shadcn@latest add "${meta.registryUrl}"`} />
              {images.length > 0 && (
                <p className="blx-doc__note">
                  Images don&rsquo;t travel through the CLI: copy <code>{assetDir}</code> ({images.length} file
                  {images.length === 1 ? "" : "s"}) into your own <code>public/</code> folder.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.ol
              key="manual"
              className="blx-steps"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={swap}
            >
              {meta.dependencies.length > 0 && (
                <li>
                  <p className="blx-steps__title">Install the dependencies</p>
                  <CommandBox build={(m) => `${m.add} ${meta.dependencies.join(" ")}`} />
                </li>
              )}
              <li>
                <p className="blx-steps__title">
                  Copy the source into <code>{meta.installDir}/</code>
                </p>
                <ul className="blx-files">
                  {panes.map((p) => (
                    <li key={p.name} className="blx-files__row">
                      <span className="blx-files__name">{p.name}</span>
                      <span className="blx-files__lines">{p.code.split("\n").length} lines</span>
                      <CopyButton text={p.code} label={`Copy ${p.name}`} compact />
                    </li>
                  ))}
                </ul>
              </li>
              {meta.assets.length > 0 && (
                <li>
                  <p className="blx-steps__title">
                    Copy the assets into <code>{assetDir}</code>
                  </p>
                  <p className="blx-doc__note">
                    {meta.assets.length} file{meta.assets.length === 1 ? "" : "s"}:{" "}
                    {meta.assets.length > 6
                      ? `${meta.assets
                          .slice(0, 4)
                          .map((a) => a.split("/").pop())
                          .join(", ")} and ${meta.assets.length - 4} more`
                      : meta.assets.map((a) => a.split("/").pop()).join(", ")}
                    .
                  </p>
                </li>
              )}
              <li>
                <p className="blx-steps__title">Render it where the section belongs</p>
                <p className="blx-doc__note">See Usage below.</p>
              </li>
            </motion.ol>
          )}
        </AnimatePresence>
      </Section>

      <Section id={id("usage")} title="Usage">
        <div className="blx-code blx-code--doc">
          <CodeBlock label={`${block.slug}-usage`} panes={[example]} />
        </div>
      </Section>

      <Section id={id("api")} title="API reference">
        <p className="blx-doc__sub">{docs.component}</p>
        {docs.props.length > 0 ? (
          <div className="blx-table" role="region" aria-label={`${docs.component} props`} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Prop</th>
                  <th scope="col">Type</th>
                  <th scope="col">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {docs.props.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <code className="blx-table__prop">{p.name}</code>
                    </td>
                    <td>
                      <code className="blx-table__type">{p.type}</code>
                    </td>
                    <td>{p.fallback ? <code className="blx-table__type">{p.fallback}</code> : <span className="blx-table__none">—</span>}</td>
                    <td className="blx-table__note">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="blx-doc__p">Takes no props — drop it in as it is.</p>
        )}
        {docs.customize && <p className="blx-doc__note blx-doc__note--box">{docs.customize}</p>}
      </Section>

      <Section id={id("a11y")} title="Accessibility">
        <List items={docs.accessibility} />
      </Section>

      <Section id={id("motion")} title="Motion">
        <List items={docs.motion} />
      </Section>

      <Section id={id("responsive")} title="Responsive behavior">
        <List items={docs.responsive} />
      </Section>

      <p className="blx-doc__stats">
        Blocx · {stats.blocks} blocks · {stats.sections} sections · part of Pin UI
      </p>
    </div>
  );
}

/** The one-line install under the title: the command for the default manager, copyable. */
export function InstallPill({ url }: { url: string }) {
  const command = `npx shadcn@latest add "${url}"`;
  return (
    <div className="blx-pill">
      <span className="blx-pill__prompt" aria-hidden="true">
        $
      </span>
      <code className="blx-pill__cmd">
        {command}
      </code>
      <CopyButton text={command} label="Copy the install command" compact />
    </div>
  );
}
