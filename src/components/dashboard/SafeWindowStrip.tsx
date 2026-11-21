'use client';

import React, { useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  DoorOpen,
  Footprints,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { useAirqua } from '@/context/AirquaContext';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Custom Chart Tooltip declared at top-level outside render
function ChartTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-xl text-[12px] flex flex-col gap-2 min-w-[200px] z-50">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 font-bold text-on-surface">
          <span>{data.fullTime}</span>
          <span className="font-mono text-primary">{data.pm25} µg/m³</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant">Ventilation:</span>
            <span
              className={`font-bold ${
                data.ventilationStatus === 'BEST'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : data.ventilationStatus === 'CAUTION'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {data.ventilationStatus === 'BEST'
                ? 'Safe Window (Open)'
                : data.ventilationStatus === 'CAUTION'
                ? 'Caution (Brief)'
                : 'Avoid (Seal)'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant">Outdoor:</span>
            <span
              className={`font-bold ${
                data.outdoorStatus === 'BEST'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : data.outdoorStatus === 'CAUTION'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {data.outdoorStatus === 'BEST'
                ? 'Optimal'
                : data.outdoorStatus === 'CAUTION'
                ? 'Light Only'
                : 'Hazardous'}
            </span>
          </div>

          {data.pm10 > 0 && (
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono pt-1 border-t border-outline-variant/40">
              <span>Coarse PM10:</span>
              <span>{data.pm10} µg/m³</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function SafeWindowStrip() {
  const { safeWindows, t } = useAirqua();
  const isMounted = useIsMounted();

  if (!safeWindows || safeWindows.hourlySlots.length === 0) {
    return null;
  }

  // First 24 hours
  const slots24 = safeWindows.hourlySlots.slice(0, 24);

  const formatHourLabel = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const { bestVentilationWindow, bestOutdoorWindow, peakSmogWindow } = safeWindows;

  // Chart data formatting
  const chartData = slots24.map((slot) => {
    const d = new Date(slot.hourISO);
    const hourLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return {
      hour: hourLabel,
      fullTime: formatHourLabel(slot.hourISO),
      pm25: slot.pm25 ?? 0,
      pm10: slot.pm10 ?? 0,
      ventilationStatus: slot.ventilationStatus,
      outdoorStatus: slot.outdoorStatus,
      hourISO: slot.hourISO,
    };
  });

  // Calculate start/end labels for ReferenceAreas
  const ventStart = bestVentilationWindow
    ? new Date(bestVentilationWindow.startISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;
  const ventEnd = bestVentilationWindow
    ? new Date(bestVentilationWindow.endISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  const smogStart = peakSmogWindow
    ? new Date(peakSmogWindow.startISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;
  const smogEnd = peakSmogWindow
    ? new Date(peakSmogWindow.endISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;


  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5">
      {/* Header and 3 Key Window Badges */}
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

        {/* Rolling Window Badges */}
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

      {/* Interactive Recharts 24-Hour Area Chart */}
      <div className="w-full h-52 sm:h-60 pt-2">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Shaded Reference Area: Best Ventilation Window */}
              {ventStart && ventEnd && (
                <ReferenceArea
                  x1={ventStart}
                  x2={ventEnd}
                  fill="#10b981"
                  fillOpacity={0.14}
                  stroke="#10b981"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}

              {/* Shaded Reference Area: Peak Smog Window */}
              {smogStart && smogEnd && (
                <ReferenceArea
                  x1={smogStart}
                  x2={smogEnd}
                  fill="#ef4444"
                  fillOpacity={0.12}
                  stroke="#ef4444"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}

              <XAxis
                dataKey="hour"
                stroke="currentColor"
                className="text-[11px] font-mono text-on-surface-variant"
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                stroke="currentColor"
                className="text-[11px] font-mono text-on-surface-variant"
                tickLine={false}
                axisLine={false}
                unit=" µg"
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="pm25"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#pm25Gradient)"
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-surface-container-low/40 rounded-xl animate-pulse" />
        )}
      </div>

      {/* Chart Legend & Helpful Interpretation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/60 text-[11px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
            <span>Green Band: Safe Ventilation Window (lowest ambient PM2.5)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/30 border border-rose-500" />
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
