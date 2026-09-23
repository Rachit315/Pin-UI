"use client";

import { useState } from "react";

/* ---------------------------------------------------------------- copying -- */

export type CopyState = "idle" | "done" | "failed";

/**
 * Copy, and be honest about it.
 *
 * Both routes can fail for reasons the page cannot control — an unfocused
 * document, a denied permission, an insecure origin — and `execCommand`
 * signals that by returning `false` rather than by throwing, which is easy to
 * miss. If neither route worked the code is selected instead and the button
 * says so, because a button that claims to have copied something it did not is
 * worse than one that admits it and hands the job back.
 */
export function useCopy() {
  const [state, setState] = useState<CopyState>("idle");

  async function copy(text: string, source: HTMLElement | null) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      } finally {
        area.remove();
      }
    }

    if (!ok && source) {
      /* leave it selected, so ⌘C / Ctrl-C finishes the job */
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      source.focus();
    }

    setState(ok ? "done" : "failed");
    setTimeout(() => setState("idle"), ok ? 1800 : 4000);
  }

  return { state, copy };
}

