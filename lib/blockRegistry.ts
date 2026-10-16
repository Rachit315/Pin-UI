import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BLOCKS, categoryName, type Block } from "./blocks";
import { BLOCK_INSTALL_DIR, blockMeta } from "./blockMeta";
import { readBlockSource } from "./source";

/**
 * A Blocx block as a shadcn registry item, for `/r/blocx/<slug>.json`.
 *
 * The same shape as a component's: `npx shadcn@latest add <url>` writes the
 * files and installs the packages. The source comes from `readBlockSource`,
 * the function the block page prints from, so what lands in a project is what
 * runs in the preview. Text assets (SVGs) travel with it; the CLI cannot carry
 * images, so those are named in the note it prints after installing.
 */

type RegistryFile = {
  path: string;
  content: string;
  type: "registry:component" | "registry:file";
  target: string;
};

const PUBLIC_DIR = path.join(process.cwd(), "public");

export async function buildBlockRegistryItem(block: Block) {
  const meta = await blockMeta(block);

  const files: RegistryFile[] = await Promise.all(
    block.files.map(async (name) => {
      const target = `${BLOCK_INSTALL_DIR}/${name}`;
      return {
        path: target,
        target,
        type: name.endsWith(".tsx") ? ("registry:component" as const) : ("registry:file" as const),
        content: await readBlockSource(name),
      };
    }),
  );

  const textAssets = meta.assets.filter((a) => a.endsWith(".svg"));
  const binaryAssets = meta.assets.filter((a) => !a.endsWith(".svg"));
  for (const asset of textAssets) {
    const target = `public${asset}`;
    files.push({
      path: target,
      target,
      type: "registry:file",
      content: await readFile(path.join(PUBLIC_DIR, ...asset.split("/").filter(Boolean)), "utf8"),
    });
  }

  const docs = [
    `${block.name} — ${block.summary}`,
    "",
    `The stylesheet sits next to the component and is imported by it, so keep them together in ${BLOCK_INSTALL_DIR}/.`,
    meta.usesNext ? "It loads its fonts with next/font, so it expects a Next.js app (App Router)." : "",
    binaryAssets.length
      ? `Its images are not part of this package. Copy public/blocx/${block.slug}/ from https://github.com/Rachit315/Pin-UI/tree/main/public/blocx/${block.slug} into your own public/ folder (${binaryAssets.length} file${binaryAssets.length === 1 ? "" : "s"}), or change the paths at the top of the component.`
      : "",
  ]
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n")
    .trim();

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: block.slug,
    type: "registry:block",
    title: block.name,
    description: `${categoryName(block.category)} block. ${block.summary}`,
    dependencies: meta.dependencies,
    files,
    docs,
  };
}

export async function buildBlockRegistryIndex() {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "pin-ui-blocx",
    homepage: "https://pinui.xyz/blocx",
    items: await Promise.all(BLOCKS.map(buildBlockRegistryItem)),
  };
}
