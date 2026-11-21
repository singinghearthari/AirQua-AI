'use client';

import React from 'react';
import { AlertTriangle, ClockAlert, RefreshCw } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';

export default function StaleDataBanner() {
  const { snapshot, simulateStale, refreshAirData, isLoadingAir, t } = useAirqua();

  if (!snapshot) return null;

  const isStale = snapshot.freshness === 'STALE' || simulateStale;
  const isUnavailable = snapshot.freshness === 'UNAVAILABLE';

  if (!isStale && !isUnavailable) return null;

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs ${
        isUnavailable
          ? 'border-error/40 bg-error-container text-on-error-container'
          : 'border-aqi-moderate/40 bg-aqi-moderate-container text-on-aqi-moderate-container'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3">
        {isUnavailable ? (
          <AlertTriangle className="h-5 w-5 shrink-0 text-error" aria-hidden="true" />
        ) : (
          <ClockAlert className="h-5 w-5 shrink-0 text-aqi-moderate" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display font-semibold text-[14px]">
            {isUnavailable
              ? t.dashboard.unavailableWarningTitle
              : t.dashboard.staleWarningTitle}
          </h2>
          <p className="text-[12px] leading-relaxed opacity-90">
            {isUnavailable
              ? t.dashboard.unavailableWarningBody
              : t.dashboard.staleWarningBody}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={refreshAirData}
        disabled={isLoadingAir}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-surface-container-lowest px-3 py-1.5 text-[12px] font-semibold text-on-surface border border-outline-variant hover:bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 shrink-0"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${isLoadingAir ? 'animate-spin text-primary' : ''}`}
          aria-hidden="true"
        />
        <span>Retry Live Sync</span>
      </button>
    </div>
  );
}
