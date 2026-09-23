import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The one directory a component page is allowed to read from.
 *
 * It is spelled out as a literal rather than assembled from the caller's
 * argument on purpose: the bundler traces filesystem access statically, and a
 * path it cannot see the shape of makes it include the entire project — the
 * whole `public` folder and all — in the server output.
 */
const LIBRARY_DIR = path.join(process.cwd(), "components", "library");

/**
 * Read one of the library's own source files as text.
 *
 * The component pages show their source this way rather than keeping a second
 * copy of the code in a string, so the snippet on the page cannot drift from
 * the component running above it. Every one of those pages is prerendered, so
 * this runs during `next build` and never on a request.
 */
export async function readLibrarySource(file: string): Promise<string> {
  if (!/^[\w.-]+\.(tsx|ts|css)$/.test(file) || file.includes("..")) {
    throw new Error(`readLibrarySource: not a library source file: ${file}`);
  }
  return readFile(path.join(LIBRARY_DIR, file), "utf8");
}
