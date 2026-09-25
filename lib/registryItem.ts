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
/** The face each component is drawn in; the OTP field uses the system's own. */
const FACES: Record<string, string | null> = {
  "balance-card": "Inter Tight",
  chips: "Poppins (600, 700 and 800)",
  "otp-input": null,
  "add-member": "Plus Jakarta Sans",
};

function docsFor(entry: Entry): string {
  const face = entry.slug in FACES ? FACES[entry.slug] : "Inter";
  const lines = [
    `${entry.name} — ${entry.tagline}`,
    "",
    `The stylesheet sits next to the component and is imported by it, so keep the two together in ${INSTALL_DIR}/.`,
    "",
    face
      ? `It is drawn in ${face}. If your project does not already load that face it will fall back to your system sans and look noticeably different.`
      : "It is set in the system's own UI face, so there is no font to load.",
  ];

  if (entry.stageDark) {
    lines.push(
      "",
      'It comes in two themes: pass theme="dark" for the dark one, or wire the prop to your own theme switch.',
    );
  }

  if (entry.slug === "otp-input") {
    lines.push(
      "",
      "On a wrong code the eggs break and fall: the pieces travel about 130px to either side of the row and 110px below it. Give it that room, or it will spill into whatever sits around it — and inside a scrolling box, it will briefly make that box scroll.",
    );
  }

  if (entry.slug === "add-member") {
    lines.push(
      "",
      "The default people use portraits from randomuser.me. Pass your own `members` — name, role, portrait URL and status — before shipping it.",
    );
  }

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
