"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";

type FieldProps = {
  label: string;
  type?: "email" | "text";
  value: string;
  invalid: boolean;
  disabled: boolean;
  autoComplete?: string;
  /** Free-form identifiers (the X handle) must not be autocorrected. */
  raw?: boolean;
  /** Fires on focus so the form can reveal the next row. */
  onFocus?: () => void;
  onChange: (value: string) => void;
};

/**
 * A white input whose focus state is drawn by Motion: an ink underline wipes in
 * from the left, and an invalid value nudges the whole field sideways once.
 */
export default function Field({
  label,
  type = "text",
  value,
  invalid,
  disabled,
  autoComplete,
  raw = false,
  onFocus,
  onChange,
}: FieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="field"
      animate={
        invalid && !reduced ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }
      }
      transition={invalid ? { duration: 0.42, ease: "easeInOut" } : spring}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field__input"
        type={type}
        value={value}
        placeholder={`${label}*`}
        autoComplete={autoComplete}
        inputMode={type === "email" ? "email" : undefined}
        autoCapitalize={raw ? "none" : undefined}
        autoCorrect={raw ? "off" : undefined}
        spellCheck={raw ? false : undefined}
        disabled={disabled}
        aria-invalid={invalid}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
      />
      <motion.span
        className="field__underline"
        aria-hidden="true"
        initial={false}
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        transition={spring}
      />
    </motion.div>
  );
}
