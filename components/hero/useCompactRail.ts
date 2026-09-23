"use client";

import { useEffect, useState } from "react";

/** The width at which the rail lies down, kept in step with `sections.css`. */
const COMPACT = "(max-width: 1080px)";

/**
 * Whether the rail is in its narrow, horizontal form.
 *
 * The stylesheet already knows this, but the entrance does not: the wide rail
 * animates with a `y: -50%` that centres it against the right edge, and the
 * narrow one is centred by margins instead — applying the wide transform to it
 * would shunt it half its own height off the top of the screen.
 *
 * It starts false so the server and the first client render agree, then
 * corrects itself after mount. The rail is only ever shown after a scroll, so
 * that correction has always happened long before anybody sees it.
 */
export function useCompactRail(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COMPACT);
    const read = () => setCompact(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  return compact;
}
