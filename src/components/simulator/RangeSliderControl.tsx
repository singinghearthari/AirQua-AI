'use client';

import React from 'react';
import { Sliders } from 'lucide-react';

interface RangeSliderControlProps {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  value: number;
  ariaLabel: string;
  onChange: (value: number) => void;
  minLabel: string;
  midLabel?: string;
  maxLabel: string;
  icon?: React.ReactNode;
}

/**
 * Accessible range slider control with live numeric readout and scale tick labels.
 */
export default function RangeSliderControl({
  label,
  valueLabel,
  min,
  max,
  value,
  ariaLabel,
  onChange,
  minLabel,
  midLabel,
  maxLabel,
  icon,
}: RangeSliderControlProps) {
  return (
    <div className="pt-3 border-t border-outline-variant/60 flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-on-surface flex items-center gap-1.5">
          {icon ?? <Sliders className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
          <span>{label}</span>
        </span>
        <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      />
      <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
        <span>{minLabel}</span>
        {midLabel && <span>{midLabel}</span>}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
