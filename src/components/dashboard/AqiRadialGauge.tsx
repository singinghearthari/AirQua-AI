'use client';

import React from 'react';

interface AqiRadialGaugeProps {
  aqiVal: number | string;
  numericAqi: number;
  isCpcb: boolean;
  strokeColor: string;
}

export default function AqiRadialGauge({
  aqiVal,
  numericAqi,
  isCpcb,
  strokeColor,
}: AqiRadialGaugeProps) {
  const radius = 68;
  const strokeWidth = 11;
  const semiCircumference = Math.PI * radius;
  const clampedAqi = Math.min(Math.max(numericAqi, 0), 500);
  const strokeDashoffset = semiCircumference - (semiCircumference * clampedAqi) / 500;

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0">
      <svg
        width="170"
        height="100"
        viewBox="0 0 170 100"
        className="overflow-visible"
        aria-hidden="true"
      >
        <path
          d="M 17 88 A 68 68 0 0 1 153 88"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-surface-container-high"
        />
        <path
          d="M 17 88 A 68 68 0 0 1 153 88"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={semiCircumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="font-mono text-[42px] font-bold leading-none text-on-surface tabular-nums tracking-tight">
          {aqiVal}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mt-0.5">
          {isCpcb ? 'CPCB NAQI' : 'US EPA AQI'}
        </span>
      </div>
    </div>
  );
}
