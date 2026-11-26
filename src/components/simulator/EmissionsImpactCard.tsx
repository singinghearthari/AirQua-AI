'use client';

import React from 'react';
import { Car, Leaf } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ImpactSimulationResult } from '@/types/airqua';

interface EmissionsImpactCardProps {
  emissionsImpact: ImpactSimulationResult['emissionsImpact'];
  cardLabel: string;
  isMounted: boolean;
}

export default function EmissionsImpactCard({
  emissionsImpact,
  cardLabel,
  isMounted,
}: EmissionsImpactCardProps) {
  const hasEmissionsSaving = emissionsImpact.co2eMaxKg > 0;

  const chartData = [
    {
      label: 'Baseline',
      value: hasEmissionsSaving ? Math.max(0.1, emissionsImpact.baselineMaxKg) : 0,
      fill: 'var(--color-outline, #94a3b8)',
      display: hasEmissionsSaving
        ? `${emissionsImpact.baselineMinKg.toFixed(2)}–${emissionsImpact.baselineMaxKg.toFixed(2)}`
        : '0.00',
    },
    {
      label: 'Simulated',
      value: hasEmissionsSaving ? Math.max(0.01, emissionsImpact.simulatedMaxKg) : 0,
      fill: 'var(--color-primary, #059669)',
      display: hasEmissionsSaving
        ? `${emissionsImpact.simulatedMinKg.toFixed(2)}–${emissionsImpact.simulatedMaxKg.toFixed(2)}`
        : '0.00',
    },
  ];

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
            {cardLabel}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-mono font-semibold text-on-primary-container border border-primary/20">
            <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {emissionsImpact.methodVersion}
          </span>
        </div>

        <div>
          <h3 className="sr-only">Airshed Carbon Emissions Impact</h3>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[28px] sm:text-[32px] text-on-surface tracking-tight">
              {hasEmissionsSaving
                ? `${emissionsImpact.co2eMinKg.toFixed(2)} – ${emissionsImpact.co2eMaxKg.toFixed(2)}`
                : '0.00'}
            </span>
            <span className="font-mono text-[13px] text-on-surface-variant font-medium">
              {emissionsImpact.unit}
            </span>
          </div>

          <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
            {hasEmissionsSaving
              ? `Avoided fossil tailpipe emissions scaled across ${emissionsImpact.timeHorizon === 'MONTH' ? '22 workdays' : emissionsImpact.timeHorizon === 'WORKWEEK' ? '5 workdays' : 'today'}.`
              : '0.0 kg CO2e saved: Scheduling and kitchen exhaust protect your lungs, but do not replace motorized vehicle travel.'}
          </p>
        </div>

        {hasEmissionsSaving && isMounted && (
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span className="font-semibold text-on-surface">Emissions Comparison:</span>
              <span>(Upper estimate in {emissionsImpact.unit})</span>
            </div>

            <p className="sr-only">
              Baseline routine emits {emissionsImpact.baselineMinKg.toFixed(2)} to{' '}
              {emissionsImpact.baselineMaxKg.toFixed(2)} {emissionsImpact.unit}; simulated swaps
              reduce this to {emissionsImpact.simulatedMinKg.toFixed(2)} to{' '}
              {emissionsImpact.simulatedMaxKg.toFixed(2)} {emissionsImpact.unit}.
            </p>

            <div className="h-[75px] w-full" style={{ minWidth: 200 }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
                >
                  <XAxis type="number" hide domain={[0, 'dataMax + 0.5']} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
                    width={65}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      const item = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                      if (!active || !item) return null;
                      return (
                        <div className="rounded-lg border border-outline-variant bg-surface-container-highest px-2.5 py-1.5 shadow-md text-[11px] font-mono text-on-surface">
                          <span className="font-bold">{item.label}: </span>
                          <span>
                            {item.display} {emissionsImpact.unit}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant border-t border-outline-variant/50 pt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                <span>
                  Baseline: {emissionsImpact.baselineMinKg.toFixed(2)}–
                  {emissionsImpact.baselineMaxKg.toFixed(2)} kg
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Simulated: {emissionsImpact.simulatedMinKg.toFixed(2)}–
                  {emissionsImpact.simulatedMaxKg.toFixed(2)} kg
                </span>
              </div>
            </div>
          </div>
        )}

        {hasEmissionsSaving && emissionsImpact.equivalenceKmMax > 0 && (
          <div className="flex items-start gap-2 text-[11px] bg-primary-container/20 p-2.5 rounded-lg border border-primary/25 text-on-surface leading-relaxed">
            <Car className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-primary font-semibold">Real-World Equivalence: </strong>
              Roughly equivalent to avoiding{' '}
              <span className="font-mono font-bold text-on-surface">
                {emissionsImpact.equivalenceKmMin} – {emissionsImpact.equivalenceKmMax} km
              </span>{' '}
              of petrol passenger car driving (illustrative benchmark at 0.16 kg CO2e/km).
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
        <span>Deterministic Math • Pure TS</span>
        <span className="text-primary font-medium">Zero LLM Guesswork</span>
      </div>
    </div>
  );
}
