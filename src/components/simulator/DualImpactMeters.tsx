'use client';

import React, { useSyncExternalStore } from 'react';
import {
  TrendingDown,
  Info,
  Leaf,
  Scale,
  Sparkles,
  Minus,
  Car,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
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
import { useAirqua } from '@/context/AirquaContext';

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

  const { personalExposure, emissionsImpact } = simulation;

  const isExposureLower = personalExposure.direction === 'LIKELY_LOWER';
  const hasEmissionsSaving = emissionsImpact.co2eMaxKg > 0;

  const peakPm25 = personalExposure.peakPm25 || 180;
  const safePm25 = personalExposure.safeWindowPm25 || 60;
  const percentDrop =
    personalExposure.reductionPct ||
    (peakPm25 > safePm25 ? Math.round(((peakPm25 - safePm25) / peakPm25) * 100) : 0);

  // Horizontal bar comparison data
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
    <div
      role="region"
      aria-label={t.simulator.dualHeading}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="font-display font-bold text-[16px] text-on-surface">
            {t.simulator.dualHeading}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-mono text-on-surface-variant border border-outline-variant/60">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          {t.simulator.noBlendedScore}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ============================================================== */}
        {/* CARD A: Personal Exposure Shift */}
        {/* ============================================================== */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
                {t.simulator.cardALabel}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                  isExposureLower
                    ? 'bg-aqi-good-container text-on-aqi-good-container border border-aqi-good/30'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {isExposureLower ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-aqi-good" aria-hidden="true" />
                    <span>{t.simulator.exposureBadgeLower}</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.simulator.exposureBadgeNeutral}</span>
                  </>
                )}
              </span>
            </div>

            <div>
              <h4 className="font-display font-bold text-[17px] text-on-surface leading-tight">
                {isExposureLower ? 'Reduced Inhaled Dose Window' : 'Baseline Exposure Routine'}
              </h4>
              <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                {personalExposure.summary}
              </p>
            </div>

            {/* Visual Before vs. After PM2.5 Meter */}
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-on-surface-variant font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Hourly Inhaled Concentration:
                </span>
                {isExposureLower && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                    ~{percentDrop}% Lower Ambient Dose
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Before: Peak Smog Hour */}
                <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-red-800 dark:text-red-300 font-semibold uppercase">
                    Peak Smog Window
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-bold text-[20px] text-red-900 dark:text-red-200">
                      {peakPm25}
                    </span>
                    <span className="text-[10px] font-mono text-red-700 dark:text-red-400">
                      µg/m³ PM2.5
                    </span>
                  </div>
                </div>

                {/* After: Shifted Safe Window */}
                <div
                  className={`rounded-lg border p-2.5 flex flex-col gap-1 ${
                    isExposureLower
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-outline-variant bg-surface-container'
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase ${
                      isExposureLower
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {isExposureLower ? 'Shifted Safe Window' : 'Current Window'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-display font-bold text-[20px] ${
                        isExposureLower
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-on-surface'
                      }`}
                    >
                      {isExposureLower ? safePm25 : peakPm25}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isExposureLower
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      µg/m³ PM2.5
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress track showing reduction */}
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${isExposureLower ? Math.max(25, 100 - percentDrop) : 100}%` }}
                />
                {isExposureLower && (
                  <div
                    className="bg-red-400/40 h-full transition-all duration-500"
                    style={{ width: `${percentDrop}%` }}
                  />
                )}
              </div>
            </div>

            {personalExposure.mechanism && (
              <div className="text-[12px] bg-surface-container-low p-3 rounded-lg border border-outline-variant/60 text-on-surface leading-relaxed">
                <strong className="font-semibold text-primary">Biological Mechanism: </strong>
                {personalExposure.mechanism}
              </div>
            )}
          </div>

          {/* Scientific Dosimetry Limitation Notice */}
          <div className="pt-3 border-t border-outline-variant/60 flex items-start gap-2 text-[11px] text-on-surface-variant leading-relaxed">
            <Info className="h-3.5 w-3.5 text-outline shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {personalExposure.limitation || t.simulator.dosimetryDisclaimer}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD B: Emissions Impact */}
        {/* ============================================================== */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
                {t.simulator.cardBLabel}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-mono font-semibold text-on-primary-container border border-primary/20">
                <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {emissionsImpact.methodVersion}
              </span>
            </div>

            <div>
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

            {/* Recharts Horizontal Bar Comparison (Baseline vs Simulated) */}
            {hasEmissionsSaving && isMounted && (
              <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
                  <span className="font-semibold text-on-surface">Emissions Comparison:</span>
                  <span>(Upper estimate in {emissionsImpact.unit})</span>
                </div>

                <div className="h-[75px] w-full" style={{ minWidth: 200 }}>
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
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-outline-variant bg-surface-container-highest px-2.5 py-1.5 shadow-md text-[11px] font-mono text-on-surface">
                                <span className="font-bold">{data.label}: </span>
                                <span>{data.display} {emissionsImpact.unit}</span>
                              </div>
                            );
                          }
                          return null;
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
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Baseline: {emissionsImpact.baselineMinKg.toFixed(2)}–{emissionsImpact.baselineMaxKg.toFixed(2)} kg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Simulated: {emissionsImpact.simulatedMinKg.toFixed(2)}–{emissionsImpact.simulatedMaxKg.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Relatable Equivalence Note */}
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

          {/* Model Provenance & Boundary */}
          <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
            <span>Deterministic Math • Pure TS</span>
            <span className="text-primary font-medium">Zero LLM Guesswork</span>
          </div>
        </div>
      </div>
    </div>
  );
}
