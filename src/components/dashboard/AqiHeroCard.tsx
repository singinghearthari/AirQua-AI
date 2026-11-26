'use client';

import React from 'react';
import { Activity, Layers, RefreshCw } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { DataFreshness } from '@/types/airqua';
import WeatherDispersionStrip from './WeatherDispersionStrip';
import AqiRadialGauge from './AqiRadialGauge';

interface AqiHeroCardProps {
  onRefresh?: () => void;
}

function getAqiTheme(aqi: number) {
  if (aqi <= 50) {
    return {
      color: '#10b981',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      dot: 'bg-emerald-500',
    };
  }
  if (aqi <= 100) {
    return {
      color: '#84cc16',
      badge: 'bg-lime-100 text-lime-900 dark:bg-lime-950/70 dark:text-lime-300 border-lime-300 dark:border-lime-700',
      dot: 'bg-lime-500',
    };
  }
  if (aqi <= 200) {
    return {
      color: '#f59e0b',
      badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      dot: 'bg-amber-500',
    };
  }
  if (aqi <= 300) {
    return {
      color: '#f97316',
      badge: 'bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      dot: 'bg-orange-500',
    };
  }
  if (aqi <= 400) {
    return {
      color: '#ef4444',
      badge: 'bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700',
      dot: 'bg-red-500',
    };
  }
  return {
    color: '#9333ea',
    badge: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    dot: 'bg-purple-600',
  };
}

function getFreshnessStyles(
  freshness: DataFreshness,
  labels: { fresh: string; stale: string; unavailable: string }
) {
  if (freshness === 'FRESH') {
    return {
      label: labels.fresh,
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    };
  }
  if (freshness === 'STALE') {
    return {
      label: labels.stale,
      dot: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }
  return {
    label: labels.unavailable,
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
  };
}

export default function AqiHeroCard({ onRefresh }: AqiHeroCardProps) {
  const { snapshot, isLoadingAir, refreshAirData, t } = useAirqua();
  if (!snapshot) return null;

  const aqiVal = snapshot.aqiValue ?? '—';
  const numericAqi = typeof snapshot.aqiValue === 'number' ? snapshot.aqiValue : 0;
  const isCpcb = snapshot.scale === 'IN_CPCB';
  const theme = getAqiTheme(numericAqi);

  const dominant =
    snapshot.pollutants.find((p) => p.code === snapshot.dominantPollutant) ||
    snapshot.pollutants[0];

  const freshnessMeta = getFreshnessStyles(snapshot.freshness, {
    fresh: t.dashboard.freshnessFresh,
    stale: t.dashboard.freshnessStale,
    unavailable: t.dashboard.freshnessUnavailable,
  });

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${snapshot.location.name} Air Quality Summary`}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5 relative overflow-hidden"
    >
      <div
        className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: theme.color }}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-on-surface tracking-tight">
            {snapshot.location.name}
            {snapshot.location.region ? ` (${snapshot.location.region})` : ''}
          </h1>

          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border ${freshnessMeta.badge}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${freshnessMeta.dot} animate-pulse`}
              aria-hidden="true"
            />
            <span>{freshnessMeta.label}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onRefresh || refreshAirData}
          disabled={isLoadingAir}
          aria-label={t.dashboard.refreshButton}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary hover:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoadingAir ? 'animate-spin text-primary' : ''}`}
            aria-hidden="true"
          />
          <span>{isLoadingAir ? t.dashboard.refreshing : t.dashboard.refreshButton}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <AqiRadialGauge
            aqiVal={aqiVal}
            numericAqi={numericAqi}
            isCpcb={isCpcb}
            strokeColor={theme.color}
          />

          <div className="flex flex-col items-center sm:items-start gap-1.5 text-center sm:text-left">
            <span
              role="status"
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[13px] font-bold shadow-2xs ${theme.badge}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${theme.dot} animate-pulse`}
                aria-hidden="true"
              />
              <span>{snapshot.aqiCategory}</span>
            </span>
            <span className="text-[12px] text-on-surface-variant">
              {isCpcb
                ? 'Standard pan-India CPCB sub-index algorithm'
                : 'Direct US EPA official PM2.5 calculation'}
            </span>
            <p className="text-[12px] text-on-surface-variant/80 max-w-md line-clamp-2 mt-0.5">
              {snapshot.disclaimer}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
          {dominant && (
            <div className="rounded-xl border border-outline-variant/80 bg-surface-container-low/70 p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {t.dashboard.dominantPollutant}
                </span>
                <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </div>
              <div className="my-1">
                <span className="font-mono text-[22px] font-bold text-on-surface">
                  {dominant.code.replace('_', '.')}
                </span>
              </div>
              <span className="font-mono text-[12px] text-on-surface-variant tabular-nums">
                {dominant.value !== null ? `${dominant.value} ${dominant.unit}` : '—'}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-outline-variant/80 bg-surface-container-low/70 p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {t.dashboard.provider}
              </span>
              <Layers className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <div className="my-1">
              <span className="font-sans font-semibold text-[13px] text-on-surface line-clamp-1">
                Copernicus CAMS
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant">Open-Meteo Verified</span>
          </div>
        </div>
      </div>

      {snapshot.weather && <WeatherDispersionStrip weather={snapshot.weather} />}
    </div>
  );
}
