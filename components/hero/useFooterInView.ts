"use client";

import { useEffect, useState } from "react";

/**
 * Whether the footer has come far enough up the screen to take over.
 *
 * The footer carries its own lockup and links, so once it is on screen the
 * floating rail would only repeat them — and, pinned to the right edge, it
 * sits on top of the footer's board. The rail hands over to the footer the way
 * the masthead hands over to the rail.
 *
 * "Far enough" is its top edge crossing two-thirds of the way up the screen,
 * so the rail leaves as the footer arrives rather than once it is all the way in.
 */
export function useFooterInView(): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer.foot");
    if (!footer || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return inView;
}
