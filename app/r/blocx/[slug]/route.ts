import { BLOCKS, blockBySlug } from "@/lib/blocks";
import { buildBlockRegistryIndex, buildBlockRegistryItem } from "@/lib/blockRegistry";

/**
 * `/r/blocx/<slug>.json` — what `npx shadcn@latest add` fetches for a block.
 *
 * Prerendered to static JSON at build time, like the components' registry.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return [...BLOCKS.map((block) => ({ slug: `${block.slug}.json` })), { slug: "registry.json" }];
}

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  /* the CLI fetches this cross-origin from wherever it is installing */
  "Access-Control-Allow-Origin": "*",
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug.endsWith(".json")) return Response.json({ error: "not found" }, { status: 404, headers });

  const name = slug.slice(0, -".json".length);
  if (name === "registry") return Response.json(await buildBlockRegistryIndex(), { headers });

  const block = blockBySlug(name);
  if (!block) {
    return Response.json(
      { error: `unknown block: ${name}`, available: BLOCKS.map((b) => b.slug) },
      { status: 404, headers },
    );
  }
  return Response.json(await buildBlockRegistryItem(block), { headers });
}
