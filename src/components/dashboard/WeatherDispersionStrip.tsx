'use client';

import React from 'react';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { WeatherTelemetry } from '@/types/airqua';

interface WeatherDispersionStripProps {
  weather: WeatherTelemetry;
}

export default function WeatherDispersionStrip({ weather }: WeatherDispersionStripProps) {
  const statusStyles =
    weather.dispersionStatus === 'STAGNANT'
      ? {
          badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700',
          dot: 'bg-amber-500',
          label: 'Stagnant Air',
        }
      : weather.dispersionStatus === 'DISPERSING'
        ? {
            badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700',
            dot: 'bg-emerald-500',
            label: 'Active Dispersion',
          }
        : {
            badge: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700',
            dot: 'bg-sky-500',
            label: 'Moderate Breeze',
          };

  return (
    <div
      role="region"
      aria-label="Live Weather & Smog Dispersion Telemetry"
      className="pt-4 border-t border-outline-variant/60 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/30 rounded-xl p-3"
    >
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

      <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
        <div className="flex flex-col w-full">
          <span className="text-[10px] font-semibold uppercase text-on-surface-variant mb-0.5">
            Smog Dispersion
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusStyles.badge}`}
            title={weather.dispersionNote}
          >
            <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} aria-hidden="true" />
            <span className="truncate">{statusStyles.label}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
