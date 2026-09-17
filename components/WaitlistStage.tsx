"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import MediaStrip from "./MediaStrip";
import StageIn from "./StageIn";
import WaitlistForm from "./WaitlistForm";
import { softSpring } from "@/lib/motion";

/**
 * Owns the one piece of state the form and the strip both care about: once
 * someone is on the list the card strip slides away, leaving the ticket alone
 * on the stage.
 */
export default function WaitlistStage() {
  const reduced = useReducedMotion();
  const [joined, setJoined] = useState(false);

  return (
    <>
      <StageIn>
        <WaitlistForm onJoined={() => setJoined(true)} />
      </StageIn>

      <AnimatePresence>
        {!joined && (
          <motion.div
            key="strip"
            exit={reduced ? { opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={softSpring}
          >
            <MediaStrip />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
