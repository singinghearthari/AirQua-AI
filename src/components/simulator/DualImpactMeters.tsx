'use client';

import React, { useSyncExternalStore } from 'react';
import { Scale, Sparkles } from 'lucide-react';
import { ImpactSimulationResult } from '@/types/airqua';
import { useAirqua } from '@/context/AirquaContext';
import ExposureShiftCard from './ExposureShiftCard';
import EmissionsImpactCard from './EmissionsImpactCard';

interface DualImpactMetersProps {
  simulation: ImpactSimulationResult;
}

const emptySubscribe = () => () => {};

export default function DualImpactMeters({ simulation }: DualImpactMetersProps) {
  const { t } = useAirqua();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={t.simulator.dualHeading}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-display font-bold text-[16px] text-on-surface">
            {t.simulator.dualHeading}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-mono text-on-surface-variant border border-outline-variant/60">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          {t.simulator.noBlendedScore}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExposureShiftCard
          personalExposure={simulation.personalExposure}
          cardLabel={t.simulator.cardALabel}
          badgeLowerLabel={t.simulator.exposureBadgeLower}
          badgeNeutralLabel={t.simulator.exposureBadgeNeutral}
          dosimetryDisclaimer={t.simulator.dosimetryDisclaimer}
        />
        <EmissionsImpactCard
          emissionsImpact={simulation.emissionsImpact}
          cardLabel={t.simulator.cardBLabel}
          isMounted={isMounted}
        />
      </div>
    </div>
  );
}
