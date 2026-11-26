'use client';

import React from 'react';
import { Clock, Info, Minus, TrendingDown } from 'lucide-react';
import { ImpactSimulationResult } from '@/types/airqua';

interface ExposureShiftCardProps {
  personalExposure: ImpactSimulationResult['personalExposure'];
  cardLabel: string;
  badgeLowerLabel: string;
  badgeNeutralLabel: string;
  dosimetryDisclaimer: string;
}

export default function ExposureShiftCard({
  personalExposure,
  cardLabel,
  badgeLowerLabel,
  badgeNeutralLabel,
  dosimetryDisclaimer,
}: ExposureShiftCardProps) {
  const isExposureLower = personalExposure.direction === 'LIKELY_LOWER';
  const peakPm25 = personalExposure.peakPm25 || 180;
  const safePm25 = personalExposure.safeWindowPm25 || 60;
  const percentDrop =
    personalExposure.reductionPct ||
    (peakPm25 > safePm25 ? Math.round(((peakPm25 - safePm25) / peakPm25) * 100) : 0);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
            {cardLabel}
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
                <span>{badgeLowerLabel}</span>
              </>
            ) : (
              <>
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{badgeNeutralLabel}</span>
              </>
            )}
          </span>
        </div>

        <div>
          <h3 className="font-display font-bold text-[17px] text-on-surface leading-tight">
            {isExposureLower ? 'Reduced Inhaled Dose Window' : 'Baseline Exposure Routine'}
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
            {personalExposure.summary}
          </p>
        </div>

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

          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden flex" aria-hidden="true">
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

      <div className="pt-3 border-t border-outline-variant/60 flex items-start gap-2 text-[11px] text-on-surface-variant leading-relaxed">
        <Info className="h-3.5 w-3.5 text-outline shrink-0 mt-0.5" aria-hidden="true" />
        <span>{personalExposure.limitation || dosimetryDisclaimer}</span>
      </div>
    </div>
  );
}
