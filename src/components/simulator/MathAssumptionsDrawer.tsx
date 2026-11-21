'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calculator, BookOpen, AlertTriangle } from 'lucide-react';
import { ImpactSimulationResult } from '@/types/airqua';
import {
  COLD_START_ERRAND_FACTOR,
  MASS_TRANSIT_FACTOR,
  TIME_HORIZONS,
  VEHICLE_SEGMENTS,
} from '@/lib/emissions/factors';
import { useAirqua } from '@/context/AirquaContext';

interface MathAssumptionsDrawerProps {
  simulation: ImpactSimulationResult;
}

export default function MathAssumptionsDrawer({ simulation }: MathAssumptionsDrawerProps) {
  const { t } = useAirqua();
  const [isOpen, setIsOpen] = useState(false);
  const { emissionsImpact } = simulation;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xs overflow-hidden">
      {/* Accordion Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="math-drawer-content"
        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-surface-container text-primary">
            <Calculator className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-[14px] text-on-surface">
              {t.simulator.showMath}
            </h4>
            <span className="text-[11px] font-mono text-on-surface-variant">
              Full transparency on vehicle emission factors, mathematical formulas, and scientific boundaries
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-primary font-medium text-[12px]">
          <span>{isOpen ? 'Hide Math' : 'Show Math'}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div
          id="math-drawer-content"
          role="region"
          aria-label="Emission Math and Model Assumptions"
          className="border-t border-outline-variant/60 p-5 bg-surface flex flex-col gap-5 text-[12px] leading-relaxed"
        >
          {/* 1. Mathematical Formula */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-on-surface text-[13px] flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Active Computational Formula ({emissionsImpact.unit}):
            </span>
            <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant font-mono text-[11px] text-on-surface overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {emissionsImpact.formula}
            </div>
          </div>

          {/* 2. Standardized Emission Factors Benchmark Table */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-on-surface text-[13px]">
              India-Specific Operational Emission Factor Benchmarks ({emissionsImpact.methodVersion}):
            </span>
            <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-mono font-bold text-on-surface-variant">
                    <th scope="col" className="p-2.5">Category</th>
                    <th scope="col" className="p-2.5">Operational Range</th>
                    <th scope="col" className="p-2.5">Benchmark Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 font-mono text-[11px] text-on-surface">
                  {Object.values(VEHICLE_SEGMENTS).map((v) => (
                    <tr key={v.id}>
                      <td className="p-2.5 font-sans font-medium">{v.label}</td>
                      <td className="p-2.5 font-bold text-primary">
                        {v.min.toFixed(2)}–{v.max.toFixed(2)} {v.unit}
                      </td>
                      <td className="p-2.5 font-sans text-on-surface-variant text-[10px]">
                        {v.source}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2.5 font-sans font-medium">Mass Transit (Metro / Intracity Bus)</td>
                    <td className="p-2.5 font-bold text-primary">
                      {MASS_TRANSIT_FACTOR.min.toFixed(3)}–{MASS_TRANSIT_FACTOR.max.toFixed(2)} {MASS_TRANSIT_FACTOR.unit}
                    </td>
                    <td className="p-2.5 font-sans text-on-surface-variant text-[10px]">
                      {MASS_TRANSIT_FACTOR.source}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-sans font-medium">Cold-Start Errand Penalty</td>
                    <td className="p-2.5 font-bold text-primary">
                      {COLD_START_ERRAND_FACTOR.min.toFixed(2)}–{COLD_START_ERRAND_FACTOR.max.toFixed(2)} {COLD_START_ERRAND_FACTOR.unit}
                    </td>
                    <td className="p-2.5 font-sans text-on-surface-variant text-[10px]">
                      {COLD_START_ERRAND_FACTOR.source}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Model Assumptions */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-on-surface text-[13px]">
              Active Scenario Assumptions &amp; Multipliers:
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant pl-1">
              <li className="font-mono text-primary font-medium">
                Time Horizon: {TIME_HORIZONS[emissionsImpact.timeHorizon]?.label} ({emissionsImpact.horizonMultiplier}x operational multiplier).
              </li>
              {emissionsImpact.assumptions.map((assumption, idx) => (
                <li key={idx}>{assumption}</li>
              ))}
            </ul>
          </div>

          {/* 4. Uncertainty & Scientific Boundaries */}
          <div className="rounded-lg bg-surface-container-low border border-outline-variant/60 p-3.5 flex items-start gap-2.5 text-on-surface-variant text-[11px] leading-relaxed">
            <AlertTriangle className="h-4 w-4 text-outline shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-on-surface font-semibold block mb-0.5">
                Scientific Uncertainty Notice:
              </strong>
              {emissionsImpact.uncertaintyNote}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
