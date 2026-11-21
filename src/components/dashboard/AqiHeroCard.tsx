'use client';

import React from 'react';
import {
  RefreshCw,
  Wind,
  Thermometer,
  Droplets,
  Compass,
  ArrowUp,
  Activity,
  Layers,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';

interface AqiHeroCardProps {
  onRefresh?: () => void;
}

export default function AqiHeroCard({ onRefresh }: AqiHeroCardProps) {
  const { snapshot, isLoadingAir, refreshAirData, t } = useAirqua();

  if (!snapshot) return null;

  const aqiVal = snapshot.aqiValue ?? '—';
  const numericAqi = typeof snapshot.aqiValue === 'number' ? snapshot.aqiValue : 0;
  const category = snapshot.aqiCategory;
  const isCpcb = snapshot.scale === 'IN_CPCB';
  const weather = snapshot.weather;

  // Visual theme colors based on AQI level
  const getTheme = (aqi: number) => {
    if (aqi <= 50) {
      return {
        color: '#10b981', // emerald-500
        gradient: 'from-emerald-500 to-teal-400',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        dot: 'bg-emerald-500',
      };
    }
    if (aqi <= 100) {
      return {
        color: '#84cc16', // lime-500
        gradient: 'from-lime-500 to-emerald-400',
        badge: 'bg-lime-100 text-lime-900 dark:bg-lime-950/70 dark:text-lime-300 border-lime-300 dark:border-lime-700',
        dot: 'bg-lime-500',
      };
    }
    if (aqi <= 200) {
      return {
        color: '#f59e0b', // amber-500
        gradient: 'from-amber-500 to-yellow-400',
        badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        dot: 'bg-amber-500',
      };
    }
    if (aqi <= 300) {
      return {
        color: '#f97316', // orange-500
        gradient: 'from-orange-500 to-amber-500',
        badge: 'bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-700',
        dot: 'bg-orange-500',
      };
    }
    if (aqi <= 400) {
      return {
        color: '#ef4444', // red-500
        gradient: 'from-red-600 to-orange-500',
        badge: 'bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700',
        dot: 'bg-red-500',
      };
    }
    return {
      color: '#9333ea', // purple-600 (Severe+ / Hazardous)
      gradient: 'from-purple-700 to-rose-600',
      badge: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      dot: 'bg-purple-600',
    };
  };

  const theme = getTheme(numericAqi);

  // SVG Gauge calculations
  // Semi-circle radius = 68, stroke = 12
  // Circumference of semi-circle = PI * 68 = 213.6
  const radius = 68;
  const strokeWidth = 11;
  const semiCircumference = Math.PI * radius;
  const maxScaleValue = isCpcb ? 500 : 500;
  const clampedAqi = Math.min(Math.max(numericAqi, 0), maxScaleValue);
  const strokeDashoffset = semiCircumference - (semiCircumference * clampedAqi) / maxScaleValue;

  // Freshness metadata
  const getFreshnessMeta = () => {
    if (snapshot.freshness === 'FRESH') {
      return {
        label: t.dashboard.freshnessFresh,
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    }
    if (snapshot.freshness === 'STALE') {
      return {
        label: t.dashboard.freshnessStale,
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    }
    return {
      label: t.dashboard.freshnessUnavailable,
      dot: 'bg-red-500',
      badge: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
    };
  };

  const freshnessMeta = getFreshnessMeta();

  // Dominant pollutant
  const dominant =
    snapshot.pollutants.find((p) => p.code === snapshot.dominantPollutant) ||
    snapshot.pollutants[0];

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${snapshot.location.name} Air Quality Summary`}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm flex flex-col gap-5 relative overflow-hidden"
    >
      {/* Subtle background ambient gradient accent */}
      <div
        className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: theme.color }}
        aria-hidden="true"
      />

      {/* Top Header: Location, Freshness & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-on-surface tracking-tight">
            {snapshot.location.name}
            {snapshot.location.region ? ` (${snapshot.location.region})` : ''}
          </h1>

          {/* Freshness Status Pill */}
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

        {/* Refresh Action */}
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

      {/* Main Metric Row: Semi-Circular Radial Gauge + Status Details */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
        {/* Left: Gauge + Category Callout */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Semi-Circular Radial Gauge */}
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <svg
              width="170"
              height="100"
              viewBox="0 0 170 100"
              className="overflow-visible"
              aria-hidden="true"
            >
              {/* Background Semi-Circle Track */}
              <path
                d="M 17 88 A 68 68 0 0 1 153 88"
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="text-surface-container-high"
              />
              {/* Animated Progress Arc */}
              <path
                d="M 17 88 A 68 68 0 0 1 153 88"
                fill="none"
                stroke={theme.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={semiCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Centered Metric Score & Status Inside Arc */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
              <span className="font-mono text-[42px] font-bold leading-none text-on-surface tabular-nums tracking-tight">
                {aqiVal}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mt-0.5">
                {isCpcb ? 'CPCB NAQI' : 'US EPA AQI'}
              </span>
            </div>
          </div>

          {/* Category Pill & Scale Details */}
          <div className="flex flex-col items-center sm:items-start gap-1.5 text-center sm:text-left">
            <span
              role="status"
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[13px] font-bold shadow-2xs ${theme.badge}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${theme.dot} animate-pulse`}
                aria-hidden="true"
              />
              <span>{category}</span>
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

        {/* Right: Dominant Pollutant Box & Data Origin */}
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
            <span className="text-[11px] text-on-surface-variant">
              Open-Meteo Verified
            </span>
          </div>
        </div>
      </div>

      {/* Weather & Smog Dispersion Telemetry Strip */}
      {weather && (
        <div
          role="region"
          aria-label="Live Weather & Smog Dispersion Telemetry"
          className="pt-4 border-t border-outline-variant/60 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/30 rounded-xl p-3"
        >
          {/* Temperature */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Thermometer className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase text-on-surface-variant">
                Temperature
              </span>
              <span className="font-mono font-bold text-[14px] text-on-surface tabular-nums">
                {weather.temperatureC}°C
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Droplets className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase text-on-surface-variant">
                Humidity
              </span>
              <span className="font-mono font-bold text-[14px] text-on-surface tabular-nums">
                {weather.humidityPct}%
              </span>
            </div>
          </div>

          {/* Wind Speed & Compass */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase text-on-surface-variant">
                Wind
              </span>
              <span className="font-mono font-bold text-[14px] text-on-surface tabular-nums flex items-center gap-1">
                {weather.windSpeedKmh} km/h
                <span className="text-[11px] font-sans font-normal text-on-surface-variant">
                  ({weather.compassDirection})
                </span>
              </span>
            </div>
          </div>

          {/* Smog Dispersion Status Pill */}
          <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-semibold uppercase text-on-surface-variant mb-0.5">
                Smog Dispersion
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                  weather.dispersionStatus === 'STAGNANT'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
                    : weather.dispersionStatus === 'DISPERSING'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700'
                }`}
                title={weather.dispersionNote}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    weather.dispersionStatus === 'STAGNANT'
                      ? 'bg-amber-500'
                      : weather.dispersionStatus === 'DISPERSING'
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">
                  {weather.dispersionStatus === 'STAGNANT'
                    ? 'Stagnant Air'
                    : weather.dispersionStatus === 'DISPERSING'
                    ? 'Active Dispersion'
                    : 'Moderate Breeze'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
