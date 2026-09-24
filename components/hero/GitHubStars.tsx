"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { LINKS } from "@/lib/links";
import { formatStars, useGitHubStars } from "@/lib/useGitHubStars";

/**
 * The GitHub square in the masthead, with the repository's stars behind it.
 *
 * Point at it and the octocat lifts up out of the square while a star and the
 * count rise into its place from below; the square widens to fit whatever the
 * count is. The width is measured from the count itself rather than set per
 * size, so 3 stars and 12k stars both fit exactly and the change between them
 * needs no code.
 *
 * The motion is plain CSS transitions keyed off one attribute. There are only
 * two states and both are known, so the stylesheet can own them: the button
 * lands on the right state whether or not a frame is ever drawn, and it costs
 * nothing while nobody is pointing at it.
 */
export default function GitHubStars(props: HTMLMotionProps<"a">) {
  const reduced = useReducedMotion();
  const stars = useGitHubStars();
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLAnchorElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const [openWidth, setOpenWidth] = useState<number | null>(null);

  /* the open width is the count's own width, and never narrower than the square */
  useLayoutEffect(() => {
    const box = boxRef.current;
    const face = faceRef.current;
    if (!box || !face) return;
    const measure = () => setOpenWidth(Math.max(box.offsetHeight, Math.ceil(face.scrollWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    observer.observe(box);
    return () => observer.disconnect();
  }, [stars]);

  const label =
    typeof stars === "number"
      ? `Pin UI on GitHub — ${stars.toLocaleString("en")} star${stars === 1 ? "" : "s"}`
      : "Pin UI on GitHub";

  return (
    <motion.a
      {...props}
      ref={boxRef}
      className="ghs"
      href={LINKS.github}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      data-open={open}
      data-reduced={reduced ? "true" : undefined}
      style={{ "--ghs-open": openWidth ? `${openWidth}px` : undefined } as React.CSSProperties}
      onPointerEnter={(event) => {
        /* a touch "enter" fires on tap, and there the tap is the whole interaction */
        if (event.pointerType !== "touch") setOpen(true);
      }}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className="ghs__face ghs__face--mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" className="ghs__mark">
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20 6C12.265 6 6 12.265 6 20C6 26.195 10.0075 31.4275 15.5725 33.2825C16.2725 33.405 16.535 32.985 16.535 32.6175C16.535 32.285 16.5175 31.1825 16.5175 30.01C13 30.6575 12.09 29.1525 11.81 28.365C11.6525 27.9625 10.97 26.72 10.375 26.3875C9.885 26.125 9.185 25.4775 10.3575 25.46C11.46 25.4425 12.2475 26.475 12.51 26.895C13.77 29.0125 15.7825 28.4175 16.5875 28.05C16.71 27.14 17.0775 26.5275 17.48 26.1775C14.365 25.8275 11.11 24.62 11.11 19.265C11.11 17.7425 11.6525 16.4825 12.545 15.5025C12.405 15.1525 11.915 13.7175 12.685 11.7925C12.685 11.7925 13.8575 11.425 16.535 13.2275C17.655 12.9125 18.845 12.755 20.035 12.755C21.225 12.755 22.415 12.9125 23.535 13.2275C26.2125 11.4075 27.385 11.7925 27.385 11.7925C28.155 13.7175 27.665 15.1525 27.525 15.5025C28.4175 16.4825 28.96 17.725 28.96 19.265C28.96 24.6375 25.6875 25.8275 22.5725 26.1775C23.08 26.615 23.5175 27.455 23.5175 28.7675C23.5175 30.64 23.5 32.145 23.5 32.6175C23.5 32.985 23.7625 33.4225 24.4625 33.2825C29.9925 31.4275 34 26.1775 34 20C34 12.265 27.735 6 20 6Z"
          />
        </svg>
      </span>

      <span className="ghs__face ghs__face--stars" ref={faceRef} aria-hidden="true">
        {/* hollow, like GitHub's own star button before it is pressed */}
        <svg viewBox="0 0 24 24" className="ghs__star">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
            d="M12 3.2l2.62 5.31 5.86.85-4.24 4.13 1 5.84L12 16.58l-5.24 2.75 1-5.84-4.24-4.13 5.86-.85L12 3.2z"
          />
        </svg>
        <span className="ghs__count">
          {typeof stars === "number" ? formatStars(stars) : "Star"}
        </span>
      </span>
    </motion.a>
  );
}
