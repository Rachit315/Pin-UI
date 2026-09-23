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
/*
 * How many times the switch has been thrown this session.
 *
 * The mark turns a full circle on every flip, and a counter is what makes it
 * keep turning the same way instead of winding back on the second press. It
 * lives here rather than in a component because the same lockup exists in four
 * places — the masthead, the rail, the component page's bar and the workbench
 * sidebar — and two of those hand the mark to each other mid-flight through a
 * shared `layoutId`. A local counter would mean the arriving mark started from
 * zero and spun back.
 */
let turns = 0;
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

function getTurns(): number {
  return turns;
}

function getServerTurns(): number {
  return 0;
}

/** Server and first client render agree; the DOM value is adopted after mount. */
function getServerSnapshot(): PinTheme {
  return DEFAULT_THEME;
}

export function setTheme(next: PinTheme) {
  if (next === current) return;
  current = next;
  turns += 1;
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
  /* a second scalar off the same subscription, so the two never disagree */
  const turnCount = useSyncExternalStore(subscribe, getTurns, getServerTurns);

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

  return { theme, turns: turnCount, toggleTheme };
}
