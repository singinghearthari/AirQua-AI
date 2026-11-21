'use client';

import React from 'react';
import { useAirqua } from '@/context/AirquaContext';

export default function PollutantGrid() {
  const { snapshot, t } = useAirqua();

  if (!snapshot || !snapshot.pollutants || snapshot.pollutants.length === 0) {
    return null;
  }

  const isCpcb = snapshot.scale === 'IN_CPCB';

  return (
    <section aria-labelledby="pollutants-heading" className="flex flex-col gap-4">
      <div>
        <h2
          id="pollutants-heading"
          className="font-display font-bold text-[18px] text-on-surface"
        >
          {t.dashboard.pollutantsHeading}
        </h2>
        <p className="text-[13px] text-on-surface-variant">
          {t.dashboard.pollutantsSub}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {snapshot.pollutants.map((pollutant) => {
          const isDominant = pollutant.code === snapshot.dominantPollutant;
          const displayVal =
            pollutant.value !== null && !isNaN(pollutant.value)
              ? pollutant.value
              : '—';

          return (
            <div
              key={pollutant.code}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-2 shadow-xs transition-colors ${
                isDominant
                  ? 'border-primary bg-primary-container/20 ring-1 ring-primary'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-display font-semibold text-[14px] text-on-surface">
                  {pollutant.code.replace('_', '.')}
                </span>
                {isDominant && (
                  <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">
                    Dominant
                  </span>
                )}
              </div>

              <div>
                <div className="font-mono text-[22px] font-bold text-on-surface tabular-nums">
                  {displayVal}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {pollutant.unit}
                </div>
              </div>

              {isCpcb && (
                <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-[11px]">
                  <span className="text-on-surface-variant">
                    {t.dashboard.subIndexLabel}:
                  </span>
                  <span className="font-mono font-semibold text-on-surface tabular-nums">
                    {pollutant.subIndex !== null && pollutant.subIndex !== undefined
                      ? pollutant.subIndex
                      : '—'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
