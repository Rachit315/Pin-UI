"use client";

import { useEffect, useRef, useState } from "react";
import { mountDeskComputer, type DeskEngine } from "./desk-computer-engine";
import "./desk-computer.css";

/**
 * Desk Computer — an isometric late-90s desk computer you can use.
 *
 * A beige CRT on a swivel base showing a browser with a search box, a
 * mid-tower with a CD-ROM and a floppy drive, a 104-key keyboard, a ball mouse
 * on its pad, a speaker and a CD-R in its jewel case, joined by cables. It is
 * one SVG, built in true isometric with the Anatomy kit, and every colour on
 * it is a token with a value for each theme.
 *
 * Focus it and type: the keys go down and the text lands in the search box;
 * Enter searches and the hard-drive LED flickers. Drag the mouse around its
 * pad — its cable follows and the cursor moves on the CRT. Click the jewel
 * case and the drive's tray slides out, the disc flies in and AutoPlay opens;
 * click the drive to eject it. Escape or the monitor's power button collapses
 * the picture to a line and a dot. It assembles itself on arrival and on every
 * theme change, and while nobody is touching it, it gives itself a tour.
 *
 * The drawing is ~480KB of SVG, so it is fetched at mount (from `src`) rather
 * than shipped in the bundle; desk-computer-engine.ts is everything it does.
 */

export type DeskComputerProps = {
  theme?: "light" | "dark";
  /** Key clicks and the CRT's power-on hum and power-off zap, synthesised. Only your own input makes sound. */
  sound?: boolean;
  /** Fill the container edge to edge; otherwise it keeps the drawing's own 1000:760 shape. */
  fill?: boolean;
  /** Where the drawing is served from. */
  src?: string;
};

export default function DeskComputer({ theme = "light", sound = true, fill = false, src = "/library/desk-computer.svg" }: DeskComputerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<DeskEngine | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  /* fetch the drawing, inline it, and start the engine on it */
  useEffect(() => {
    const stage = stageRef.current;
    const art = artRef.current;
    const status = statusRef.current;
    if (!stage || !art || !status) return;
    const abort = new AbortController();
    let engine: DeskEngine | null = null;
    setState("loading");
    fetch(src, { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((markup) => {
        if (abort.signal.aborted) return;
        art.innerHTML = markup;
        const svg = art.querySelector("svg");
        if (!svg) throw new Error("the drawing has no <svg>");
        engine = mountDeskComputer({ stage, svg, status, muted: !soundRef.current });
        engineRef.current = engine;
        setState("ready");
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted) return;
        console.error("[DeskComputer]", err);
        setState("failed");
      });
    return () => {
      abort.abort();
      engine?.destroy();
      engineRef.current = null;
      art.innerHTML = "";
    };
  }, [src]);

  useEffect(() => {
    engineRef.current?.setMuted(!sound);
  }, [sound]);

  /* the system assembles itself again under the new light, as the figure always has */
  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    engineRef.current?.replayIntro();
  }, [theme]);

  return (
    <div className="pdesk" data-theme={theme} data-fill={fill || undefined} data-ready={state === "ready" || undefined}>
      <div
        ref={stageRef}
        className="pdesk__stage"
        tabIndex={0}
        role="group"
        aria-label="Desk computer. Type to search on its screen; Enter searches; Escape or the monitor's power button switches the screen. Drag the mouse; click the CD to load it."
      >
        <div ref={artRef} />
        <span ref={statusRef} className="pdesk__sr" role="status" aria-live="polite" />
      </div>

      {state === "failed" && <p className="pdesk__error">The drawing couldn&rsquo;t be loaded from {src}.</p>}
    </div>
  );
}
