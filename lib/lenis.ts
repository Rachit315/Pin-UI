import type Lenis from "lenis";

/**
 * The landing page's Lenis instance, where anything that has to stop the page
 * from moving can reach it.
 *
 * Lenis drives the scroll itself, so locking `html`'s overflow is not enough
 * on its own: the phone menu stops Lenis while its sheet is open and starts it
 * again after, and jumps to a section go through `scrollTo` so they glide on
 * the same curve as the wheel. Off the landing page there is no instance and
 * every caller falls back to the browser's own scrolling.
 */
export const lenisRef: { current: Lenis | null } = { current: null };

/** Glide to an element with Lenis when it is running, natively when it is not. */
export function scrollToElement(el: HTMLElement, smooth: boolean) {
  const lenis = lenisRef.current;
  if (lenis && smooth) {
    lenis.scrollTo(el, { offset: 0 });
    return;
  }
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}
