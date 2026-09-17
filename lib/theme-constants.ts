/** Hook-free so the root layout (a server component) can import it. */
export type PinTheme = "light" | "crimson";

export const DEFAULT_THEME: PinTheme = "light";

export const THEME_STORAGE_KEY = "pin-ui-theme";

/**
 * The tab icon for each theme. Shared by the inline pre-paint script in the
 * layout and by `FaviconSync`, so the two can never drift apart.
 *
 * The crimson mark is white and would vanish against a light browser chrome,
 * so that icon carries its own red field; the light mark is red and reads on
 * any chrome, so it stays transparent.
 */
export const FAVICONS = {
  light: {
    svg: "/icon-light.svg",
    png: "/icon-light-32.png",
    themeColor: "#ffffff",
  },
  crimson: {
    svg: "/icon-crimson.svg",
    png: "/icon-crimson-32.png",
    themeColor: "#e60024",
  },
} as const satisfies Record<PinTheme, { svg: string; png: string; themeColor: string }>;
