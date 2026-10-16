import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockView from "@/components/blocks/BlockView";
import { type CodePane } from "@/components/library/CodeBlock";
import { BLOCKS, SHELF_ORDER, blockBySlug, blocksIn, categoryName, type Block } from "@/lib/blocks";
import { BLOCK_DOCS } from "@/lib/blockDocs";
import { BLOCK_INSTALL_DIR, blockMeta } from "@/lib/blockMeta";
import { readBlockSource } from "@/lib/source";
import { SITE_URL } from "@/lib/site";

/* every block page is known up front, so all of them are prerendered */
export function generateStaticParams() {
  return BLOCKS.map((block) => ({ slug: block.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const block = blockBySlug((await params).slug);
  if (!block) return { title: "Blocx — Pin UI" };
  return {
    title: `${block.name} — Blocx`,
    description: `${categoryName(block.category)} block. ${block.note}`.slice(0, 160),
    alternates: { canonical: `/blocx/${block.slug}` },
  };
}

/*
 * The source on the Code tab is read off disk during the build, so it is
 * literally the code running in the preview beside it.
 */
async function sourceFor(block: Block): Promise<CodePane[]> {
  return Promise.all(
    block.files.map(async (name) => ({
      name,
      lang: name.endsWith(".css") ? ("css" as const) : ("tsx" as const),
      code: await readBlockSource(name),
    })),
  );
}

export default async function BlockPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const block = blockBySlug(slug);
  if (!block) notFound();
  const [panes, meta] = await Promise.all([sourceFor(block), blockMeta(block)]);
  return (
    <BlockView
      block={block}
      panes={panes}
      docs={BLOCK_DOCS[block.slug]}
      meta={{ ...meta, registryUrl: `${SITE_URL}/r/blocx/${block.slug}.json`, installDir: BLOCK_INSTALL_DIR }}
      stats={{ blocks: BLOCKS.length, sections: SHELF_ORDER.filter((id) => blocksIn(id).length).length }}
    />
  );
}
