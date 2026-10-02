import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type CodePane } from "@/components/library/CodeBlock";
import WorkbenchStage from "@/components/library/WorkbenchStage";
import { LIBRARY, bySlug } from "@/components/library/registry";
import { readLibrarySource } from "@/lib/source";
import { SITE_URL } from "@/lib/site";
import { componentJsonLd, safeJsonLd } from "@/lib/jsonld";

/* every component page is known up front, so all of them are prerendered */
export function generateStaticParams() {
  return LIBRARY.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const entry = bySlug((await params).slug);
  if (!entry) return { title: "Pin UI" };
  return {
    title: `${entry.name} — Pin UI`,
    description: `${entry.tagline} ${entry.blurb}`.slice(0, 160),
    alternates: { canonical: `/components/${entry.slug}` },
  };
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = bySlug(slug);
  if (!entry) notFound();

  /*
   * The source is read off disk rather than kept as a second copy in a string,
   * so the code in the drawer is literally the code running on the stage. This
   * page is prerendered, so the read happens once during the build.
   */
  const panes: CodePane[] = await Promise.all(
    entry.files.map(async (file) => ({
      name: file.name,
      lang: file.lang,
      code: await readLibrarySource(file.name),
    })),
  );

  const schemas = componentJsonLd({
    slug: entry.slug,
    name: entry.name,
    tagline: entry.tagline,
    blurb: entry.blurb,
  });

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema as Record<string, unknown>) }}
        />
      ))}
      <WorkbenchStage entry={entry} panes={panes} registryUrl={`${SITE_URL}/r/${entry.slug}.json`} />
    </>
  );
}
