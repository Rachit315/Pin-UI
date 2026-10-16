import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Block } from "./blocks";
import { readBlockSource } from "./source";

/**
 * What a block needs, read off the block itself during the build.
 *
 * The packages come from the imports in its own files and the assets from its
 * own folder under public/, so the install instructions on the page — and the
 * registry item the CLI fetches — cannot drift from the code they describe.
 */

export type BlockMeta = {
  /** npm packages the block imports, besides React and Next.js. */
  dependencies: string[];
  /** Whether it uses next/font (or anything else from Next.js). */
  usesNext: boolean;
  /** Its files under public/, as site paths: "/blocx/<slug>/…". */
  assets: string[];
};

/** Where an installed block lands in someone else's project. */
export const BLOCK_INSTALL_DIR = "components/blocx";

/* spelled out as a literal, so the bundler traces one folder rather than the whole project */
const PUBLIC_BLOCX = path.join(process.cwd(), "public", "blocx");

const IMPORT = /^\s*import\s[^;]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

/** "@scope/pkg/deep/path" → "@scope/pkg"; "pkg/sub" → "pkg". */
function packageOf(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export async function blockMeta(block: Block): Promise<BlockMeta> {
  const sources = await Promise.all(block.files.map((f) => readBlockSource(f)));
  const deps = new Set<string>();
  let usesNext = false;

  for (const src of sources) {
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2];
      if (!spec || spec.startsWith(".") || spec.startsWith("@/")) continue;
      const pkg = packageOf(spec);
      if (pkg === "react" || pkg === "react-dom") continue;
      if (pkg === "next") {
        usesNext = true;
        continue;
      }
      deps.add(pkg);
    }
  }

  let assets: string[] = [];
  if (/^[a-z0-9-]+$/.test(block.slug)) {
    try {
      const entries = await readdir(path.join(PUBLIC_BLOCX, block.slug), { recursive: true, withFileTypes: true });
      assets = entries
        .filter((e) => e.isFile())
        .map((e) => {
          const rel = path.relative(path.join(PUBLIC_BLOCX, block.slug), path.join(e.parentPath, e.name));
          return `/blocx/${block.slug}/${rel.split(path.sep).join("/")}`;
        })
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    } catch {
      /* no folder: the block ships no assets */
    }
  }

  return { dependencies: [...deps].sort(), usesNext, assets };
}
