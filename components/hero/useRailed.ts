"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * A layout effect on the client, a plain effect on the server.
 *
 * The first read has to happen before the browser paints, or a page restored
 * part-way down shows the masthead for a frame before it is corrected. React
 * warns about `useLayoutEffect` during server rendering, where it does nothing
 * anyway, so the server gets the harmless one.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type Railed = {
  /** True once the hero has largely left the screen. */
  railed: boolean;
  /**
   * True only for the hand-over caused by the very first read.
   *
   * A page loaded already scrolled has to correct itself from the top-of-page
   * state the server rendered, and animating that correction would show the
   * masthead flying away from a place it was never really at. Consumers use it
   * to make that one hand-over instant; every later one animates normally.
   */
  instant: boolean;
};

/**
 * Whether the page has scrolled far enough for the masthead to hand over to the
 * side rail.
 *
 * The masthead, the rail and the component pages' bar all read it, so the one
 * hands over to the other on the same frame rather than overlapping for a
 * moment. The threshold has hysteresis — it turns on later than it turns off —
 * because a single boundary makes the two flicker against each other when you
 * park the scroll right on it.
 */
export function useRailed(enterAt = 0.55, leaveAt = 0.4): Railed {
  const [state, setState] = useState<Railed>({ railed: false, instant: false });

  useIsoLayoutEffect(() => {
    let frame = 0;
    let first = true;

    const read = () => {
      frame = 0;
      const past = window.scrollY / Math.max(1, window.innerHeight);
      const wasFirst = first;
      first = false;

      setState((prev) => {
        const next = prev.railed ? past > leaveAt : past > enterAt;
        if (next === prev.railed) return prev;
        return { railed: next, instant: wasFirst };
      });
    };

    const onScroll = () => {
      /* scroll fires far more often than the screen refreshes */
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enterAt, leaveAt]);

  return state;
}
