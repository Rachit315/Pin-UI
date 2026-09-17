"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import { SITE_URL } from "@/lib/site";
import { ticketBlob, type TicketArt } from "@/lib/ticketImage";

type Status = "idle" | "working" | "failed";

/** Reads the live theme so the exported PNG matches what is on screen. */
function readArt(email: string, handle: string): TicketArt {
  const root = getComputedStyle(document.documentElement);
  const token = (key: string, fallback: string) =>
    root.getPropertyValue(key).trim() || fallback;

  return {
    email,
    handle,
    from: token("--pin-ticket-from", "#e60024"),
    to: token("--pin-ticket-to", "#ff6f86"),
    ink: token("--pin-ticket-ink", "#ffffff"),
    page: token("--pin-page", "#ffffff"),
    font: token("--pin-font", "system-ui, sans-serif"),
  };
}

export default function TicketActions({
  email,
  handle,
}: {
  email: string;
  handle: string;
}) {
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");

  async function onDownload() {
    setStatus("working");
    try {
      const blob = await ticketBlob(readArt(email, handle));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pin-ui-waitlist-${handle.replace(/^@/, "") || "pass"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      /* give the download a tick to start before the blob goes away */
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  }

  function onShare() {
    const text = `I just secured my spot on the Pin UI waitlist. 50 spots. I'm in.`;
    const url = new URL("https://x.com/intent/post");
    url.searchParams.set("text", text);
    /* always the canonical site — a localhost URL in someone's post is noise */
    url.searchParams.set("url", SITE_URL);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  const tap = reduced ? undefined : { scale: 0.97 };
  const hover = reduced ? undefined : { y: -2 };

  return (
    <div className="actions">
      <motion.button
        type="button"
        className="action"
        onClick={onDownload}
        disabled={status === "working"}
        whileHover={hover}
        whileTap={tap}
        transition={spring}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.75v11m0 0 4-4m-4 4-4-4M4.5 17.5v1.25a1.75 1.75 0 0 0 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V17.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {status === "working" ? "Saving…" : "Download ticket"}
      </motion.button>

      <motion.button
        type="button"
        className="action action--solid"
        onClick={onShare}
        whileHover={hover}
        whileTap={tap}
        transition={spring}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.5 3.5h4.2l5 6.7 5.6-6.7h2.2l-6.8 8.1 7.2 9.6h-4.2l-5.4-7.2-6 7.2H3.1l7.3-8.7L3.5 3.5Z"
            fill="currentColor"
          />
        </svg>
        Post on X
      </motion.button>

      <p className="actions__note" role="status" aria-live="polite">
        {status === "failed" ? "Could not save the image — try again." : ""}
      </p>
    </div>
  );
}
