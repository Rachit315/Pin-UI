"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hydrates its children only once they come near the screen.
 *
 * The server renders the children as usual, so the HTML — what a visitor
 * sees at first paint and what a crawler reads — is unchanged. In the
 * browser the server's markup is kept as it is (an empty innerHTML that
 * React is told not to reconcile) and nothing below is hydrated until the
 * section is within `margin` of the viewport; then the children render for
 * real, over identical markup. A section far down the page costs the first
 * load nothing, and it is live well before anyone reaches it.
 *
 * The wrapper is `display: contents`, so it adds no box to the layout; what
 * is watched is its first child.
 */
export default function LazyHydrate({ children, margin = "600px" }: { children: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  /* the server always renders the children; the browser starts out holding the server's markup */
  const [live, setLive] = useState(() => typeof window === "undefined");

  useEffect(() => {
    if (live) return;
    const target = ref.current?.firstElementChild;
    if (!target || typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setLive(true);
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    io.observe(target);
    /* a link to a section further down (#testimonials) jumps straight there: hydrate on the way */
    const onHash = () => setLive(true);
    window.addEventListener("hashchange", onHash);
    return () => {
      io.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [live, margin]);

  if (live) {
    return (
      <div ref={ref} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }
  return <div ref={ref} style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
}
