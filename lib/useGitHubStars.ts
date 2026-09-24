"use client";

import { useEffect, useState } from "react";

/*
 * One request per page load, however many buttons ask. The masthead and
 * anything else that shows the count share this promise, so they can never
 * disagree and the endpoint is hit once.
 */
let pending: Promise<number | null> | null = null;
let known: number | null | undefined;

function load(): Promise<number | null> {
  if (!pending) {
    pending = fetch("/api/github-stars")
      .then((r) => (r.ok ? r.json() : { stars: null }))
      .then((d: { stars?: unknown }) => (typeof d.stars === "number" ? d.stars : null))
      .catch(() => null)
      .then((stars) => {
        known = stars;
        return stars;
      });
  }
  return pending;
}

/** The repository's star count: `undefined` while loading, `null` if unavailable. */
export function useGitHubStars(): number | null | undefined {
  const [stars, setStars] = useState<number | null | undefined>(known);

  useEffect(() => {
    let alive = true;
    void load().then((value) => {
      if (alive) setStars(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return stars;
}

/**
 * Short enough to sit in a button at any size: 3, 999, 1.2k, 12k, 1.2M.
 * The full figure goes in the accessible label.
 */
export function formatStars(n: number): string {
  if (n < 1000) return String(n);
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
    .format(n)
    .toLowerCase();
}
