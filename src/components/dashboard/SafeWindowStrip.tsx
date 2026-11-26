'use client';

import React, { useSyncExternalStore } from 'react';
import { AlertTriangle, DoorOpen, Footprints } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { formatIsoClockTime } from '@/lib/storage/chatStorage';
import SafeWindowChart, { SafeWindowChartDatum } from './SafeWindowChart';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function formatHourLabel(isoString: string): string {
  try {
    return formatIsoClockTime(isoString, true);
  } catch (err) {
    console.warn('[SafeWindowStrip] Failed to format hour label:', isoString, err);
    return isoString;
  }
}

function format24h(isoString: string | undefined): string | null {
  if (!isoString) return null;
  try {
    return formatIsoClockTime(isoString, false);
  } catch (err) {
    console.warn('[SafeWindowStrip] Failed to format 24h time:', isoString, err);
    return null;
  }
}

export default function SafeWindowStrip() {
  const { safeWindows, t } = useAirqua();
  const isMounted = useIsMounted();

  if (!safeWindows || safeWindows.hourlySlots.length === 0) {
    return null;
  }

  const slots24 = safeWindows.hourlySlots.slice(0, 24);
  const { bestVentilationWindow, bestOutdoorWindow, peakSmogWindow } = safeWindows;

  const chartData: SafeWindowChartDatum[] = slots24.map((slot) => ({
    hour: format24h(slot.hourISO) || slot.hourISO,
    fullTime: formatHourLabel(slot.hourISO),
    pm25: slot.pm25 ?? 0,
    pm10: slot.pm10 ?? 0,
    ventilationStatus: slot.ventilationStatus,
    outdoorStatus: slot.outdoorStatus,
    hourISO: slot.hourISO,
  }));

  const screenReaderSummary = [
    bestVentilationWindow
      ? `Best ventilation window is ${formatHourLabel(bestVentilationWindow.startISO)} to ${formatHourLabel(bestVentilationWindow.endISO)} averaging ${bestVentilationWindow.avgPm25} µg/m³ PM2.5.`
      : '',
    bestOutdoorWindow
      ? `Best outdoor window is ${formatHourLabel(bestOutdoorWindow.startISO)} to ${formatHourLabel(bestOutdoorWindow.endISO)} averaging ${bestOutdoorWindow.avgPm25} µg/m³ PM2.5.`
      : '',
    peakSmogWindow
      ? `Peak smog window is ${formatHourLabel(peakSmogWindow.startISO)} to ${formatHourLabel(peakSmogWindow.endISO)} averaging ${peakSmogWindow.avgPm25} µg/m³ PM2.5.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="safe-window-heading"
              className="font-display font-bold text-[18px] text-on-surface tracking-tight"
            >
              {t.dashboard.safeWindowHeading}
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant">
              24h Dispersion Forecast
            </span>
          </div>
          <p className="text-[13px] text-on-surface-variant max-w-prose mt-0.5">
            {t.dashboard.safeWindowSub}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bestVentilationWindow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-[12px] font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap shadow-2xs">
              <DoorOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                {t.dashboard.bestToVentilate}:{' '}
                <strong>
                  {formatHourLabel(bestVentilationWindow.startISO)} –{' '}
                  {formatHourLabel(bestVentilationWindow.endISO)}
                </strong>{' '}
                ({bestVentilationWindow.avgPm25} µg/m³)
              </span>
            </span>
          )}

          {bestOutdoorWindow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-container/40 px-3 py-1 text-[12px] font-semibold text-on-primary-container whitespace-nowrap shadow-2xs">
              <Footprints className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>
                {t.dashboard.bestOutdoor}:{' '}
                <strong>
                  {formatHourLabel(bestOutdoorWindow.startISO)} –{' '}
                  {formatHourLabel(bestOutdoorWindow.endISO)}
                </strong>{' '}
                ({bestOutdoorWindow.avgPm25} µg/m³)
              </span>
            </span>
          )}

          {peakSmogWindow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 text-[12px] font-semibold text-rose-800 dark:text-rose-300 whitespace-nowrap shadow-2xs">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>
                {t.dashboard.peakSmog}:{' '}
                <strong>
                  {formatHourLabel(peakSmogWindow.startISO)} –{' '}
                  {formatHourLabel(peakSmogWindow.endISO)}
                </strong>{' '}
                ({peakSmogWindow.avgPm25} µg/m³)
              </span>
            </span>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {screenReaderSummary}
      </p>

      <SafeWindowChart
        chartData={chartData}
        isMounted={isMounted}
        ventStart={format24h(bestVentilationWindow?.startISO)}
        ventEnd={format24h(bestVentilationWindow?.endISO)}
        smogStart={format24h(peakSmogWindow?.startISO)}
        smogEnd={format24h(peakSmogWindow?.endISO)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/60 text-[11px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" aria-hidden="true" />
            <span>Green Band: Safe Ventilation Window (lowest ambient PM2.5)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/30 border border-rose-500" aria-hidden="true" />
            <span>Red Band: Peak Smog (ground-level thermal trapping)</span>
          </span>
        </div>

        <span className="italic">
          Hover or tap any hour on the curve to inspect exact particulate concentration.
        </span>
      </div>
    </div>
  );
}
