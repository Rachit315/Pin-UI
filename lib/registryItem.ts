import "server-only";
import { LIBRARY, type Entry } from "@/components/library/registry";
import { readLibrarySource } from "./source";

/**
 * A Pin UI component as a shadcn registry item.
 *
 * There is no CLI to publish: `npx shadcn@latest add <url>` takes any URL that
 * answers with this shape, so the install command is just a link to one of
 * these files. The contents come from `readLibrarySource`, the same function
 * the component page prints from, so what somebody installs is byte-for-byte
 * what is running on the stage.
 *
 * Schema: https://ui.shadcn.com/schema/registry-item.json
 */

/** Where an installed component lands in someone else's project. */
export const INSTALL_DIR = "components/pinui";

type RegistryFile = {
  path: string;
  content: string;
  type: "registry:component" | "registry:file";
  target: string;
};

export type RegistryItem = {
  $schema: string;
  name: string;
  type: "registry:component";
  title: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
  /** Printed by the CLI once the files have landed. */
  docs: string;
};

/**
 * The notes worth reading after an install, per component.
 *
 * Both of these have bitten this project already: a component whose photograph
 * is missing renders an empty tile, and one asking for a face the host project
 * never loads falls back silently to the system sans. Saying so at install time
 * is cheaper than letting somebody find out by looking at it.
 */
function docsFor(entry: Entry): string {
  const lines = [
    `${entry.name} — ${entry.tagline}`,
    "",
    `The stylesheet sits next to the component and is imported by it, so keep the two together in ${INSTALL_DIR}/.`,
    "",
    "It is drawn in Inter" +
      (entry.slug === "balance-card" ? " Tight" : "") +
      ". If your project does not already load that face the card will fall back to your system sans and look noticeably different.",
  ];

  if (entry.slug === "cart-card") {
    lines.push(
      "",
      "The photograph is not part of this package: `image` defaults to /library/shoe.jpg. Point it at your own product shot, or drop one at that path. It is multiplied onto the tile, so a plain white backdrop melts away on its own.",
    );
  }

  return lines.join("\n");
}

export async function buildRegistryItem(entry: Entry): Promise<RegistryItem> {
  const files = await Promise.all(
    entry.files.map(async (file): Promise<RegistryFile> => {
      const target = `${INSTALL_DIR}/${file.name}`;
      return {
        path: target,
        target,
        /* only the .tsx is a component; the stylesheet is carried alongside it */
        type: file.lang === "tsx" ? "registry:component" : "registry:file",
        content: await readLibrarySource(file.name),
      };
    }),
  );

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: entry.slug,
    type: "registry:component",
    title: entry.name,
    description: entry.tagline,
    /* the only thing any of them needs at runtime */
    dependencies: ["motion"],
    files,
    docs: docsFor(entry),
  };
}

/** The whole shelf, for `/r/registry.json`. */
export async function buildRegistryIndex() {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "pin-ui",
    homepage: "https://pinui.xyz",
    items: await Promise.all(LIBRARY.map(buildRegistryItem)),
  };
}
