import type { Metadata } from "next";
import LibraryIndex from "@/components/library/LibraryIndex";
import { LIBRARY } from "@/components/library/registry";
import "@/app/hero.css";
import "@/app/sections.css";

export const metadata: Metadata = {
  title: "All components — Pin UI",
  description: `Every Pin UI component in one place, sorted by kind: ${LIBRARY.map((entry) => entry.name).join(", ")}.`,
  alternates: { canonical: "/components" },
};

/**
 * The whole library — where the landing page's "View all" goes. It stands on
 * its own, outside the workbench: the sidebar belongs to the component pages,
 * where it says which one you are on.
 */
export default function ComponentsIndex() {
  return <LibraryIndex />;
}
