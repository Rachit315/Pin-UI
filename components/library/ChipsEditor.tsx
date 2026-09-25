"use client";

import type React from "react";
import { useId } from "react";

export type ChipsSettings = {
  corner: number;
  shadow: number;
  rows: 2 | 3 | 4;
};

/**
 * The Chips' own props, live on the stage: the corner radius, the cast shadow
 * and the layout (how many rows of four). It edits exactly the props the
 * component takes, so whatever you land on is what you pass in your own code.
 *
 * Part of the workbench, not of the component: nobody installing Chips gets
 * this panel.
 */
export default function ChipsEditor({
  value,
  onChange,
}: {
  value: ChipsSettings;
  onChange: (next: ChipsSettings) => void;
}) {
  const id = useId();
  const set = (patch: Partial<ChipsSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="wbedit" role="group" aria-label="Edit the chips">
      <Slider
        id={`${id}-corner`}
        label="Corner"
        min={0}
        max={40}
        value={value.corner}
        unit="px"
        onChange={(corner) => set({ corner })}
      />

      <span className="wbedit__rule" aria-hidden="true" />

      <Slider
        id={`${id}-shadow`}
        label="Shadow"
        min={0}
        max={100}
        value={value.shadow}
        onChange={(shadow) => set({ shadow })}
      />

      <span className="wbedit__rule" aria-hidden="true" />

      <div className="wbedit__field">
        <span className="wbedit__label" id={`${id}-rows`}>
          Layout
        </span>
        <div className="wbedit__seg" role="radiogroup" aria-labelledby={`${id}-rows`}>
          {([2, 3, 4] as const).map((rows) => (
            <button
              key={rows}
              type="button"
              role="radio"
              aria-checked={value.rows === rows}
              aria-label={`${rows} rows`}
              className="wbedit__segButton"
              onClick={() => set({ rows })}
            >
              {rows}
            </button>
          ))}
          {/* the lit segment slides between the three rather than jumping */}
          <span
            className="wbedit__segThumb"
            aria-hidden="true"
            style={{ "--seg": value.rows - 2 } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  min,
  max,
  value,
  unit = "",
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="wbedit__field" htmlFor={id}>
      <span className="wbedit__label">{label}</span>
      <input
        id={id}
        className="wbedit__range"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={`${value}${unit}`}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="wbedit__value">{value}</span>
    </label>
  );
}
