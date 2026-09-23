import { LIBRARY, bySlug } from "@/components/library/registry";
import { buildRegistryIndex, buildRegistryItem } from "@/lib/registryItem";

/**
 * `/r/<slug>.json` — what `npx shadcn@latest add` fetches.
 *
 * Every one of these is known at build time, so they are prerendered to static
 * JSON and served from the edge rather than assembled per request.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return [...LIBRARY.map((entry) => ({ slug: `${entry.slug}.json` })), { slug: "registry.json" }];
}

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  /*
   * The CLI is fetching this cross-origin from whatever machine is installing,
   * so it has to be readable from anywhere. It is public source either way —
   * the same bytes are already printed on the component page.
   */
  "Access-Control-Allow-Origin": "*",
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug.endsWith(".json")) {
    return Response.json({ error: "not found" }, { status: 404, headers });
  }

  const name = slug.slice(0, -".json".length);

  if (name === "registry") {
    return Response.json(await buildRegistryIndex(), { headers });
  }

  const entry = bySlug(name);
  if (!entry) {
    return Response.json(
      { error: `unknown component: ${name}`, available: LIBRARY.map((item) => item.slug) },
      { status: 404, headers },
    );
  }

  return Response.json(await buildRegistryItem(entry), { headers });
}
