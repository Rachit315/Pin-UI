"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  type PinTheme,
  THEME_STORAGE_KEY,
} from "./theme-constants";

export type { PinTheme };

/**
 * The theme lives on `<html data-pin-theme>` and in this tiny external store.
 *
 * Deliberately not React context: the provider would have to sit in the root
 * layout (a server component) and the pages are rendered as its `children`, so
 * a plain subscribable store is both simpler and boundary-proof.
 */
let current: PinTheme = DEFAULT_THEME;
let adopted = false;
const listeners = new Set<() => void>();

function readDom(): PinTheme {
  return document.documentElement.dataset.pinTheme === "crimson"
    ? "crimson"
    : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PinTheme {
  return current;
}

/** Server and first client render agree; the DOM value is adopted after mount. */
function getServerSnapshot(): PinTheme {
  return DEFAULT_THEME;
}

export function setTheme(next: PinTheme) {
  if (next === current) return;
  current = next;
  document.documentElement.dataset.pinTheme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* private mode or blocked storage — the theme just will not persist */
  }
  listeners.forEach((listener) => listener());
}

export function usePinTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* Pick up whatever the no-flash script wrote, once, after hydration. */
  useEffect(() => {
    if (adopted) return;
    adopted = true;
    const fromDom = readDom();
    if (fromDom !== current) {
      current = fromDom;
      listeners.forEach((listener) => listener());
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(current === "light" ? "crimson" : "light");
  }, []);

  return { theme, toggleTheme };
}
