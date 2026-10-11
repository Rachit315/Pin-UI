"use client";

import LunaHero from "./LunaHero";

export default function LunaHeroPreview() {
  return (
    <div
      onClickCapture={(event) => {
        // Storefront destinations belong to the consuming site. Keep preview
        // links here while leaving the reusable block's configurable URLs intact.
        if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
      }}
    >
      <LunaHero />
    </div>
  );
}
