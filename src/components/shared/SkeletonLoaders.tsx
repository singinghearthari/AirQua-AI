'use client';

import React from 'react';

export function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading real-time air quality telemetry"
    >
      {/* Hero Card Skeleton */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xs">
        <div className="flex flex-col gap-3 flex-1">
          <div className="h-7 w-48 bg-surface-container rounded-md" />
          <div className="flex items-center gap-4">
            <div className="h-16 w-24 bg-surface-container rounded-lg" />
            <div className="h-10 w-44 bg-surface-container rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-surface-container-low rounded" />
          <div className="h-12 w-full max-w-lg bg-surface-container-low rounded-lg mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
          <div className="h-24 bg-surface-container-low rounded-lg" />
          <div className="h-24 bg-surface-container-low rounded-lg" />
        </div>
      </div>

      {/* Safe Window Skeleton */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="h-6 w-56 bg-surface-container rounded-md" />
          <div className="flex gap-2">
            <div className="h-7 w-32 bg-surface-container rounded-full" />
            <div className="h-7 w-32 bg-surface-container rounded-full" />
          </div>
        </div>
        <div className="h-44 w-full bg-surface-container-low rounded-lg" />
      </div>

      {/* 3-Card Planner Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-3" />
        <div className="h-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-3" />
        <div className="h-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-3" />
      </div>
    </div>
  );
}

export function RoomScanSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 animate-pulse"
      aria-busy="true"
      aria-label="Analyzing image with Gemini Vision"
    >
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col gap-4">
        <div className="h-8 w-64 bg-surface-container rounded-md" />
        <div className="h-4 w-96 bg-surface-container-low rounded" />
        <div className="h-72 w-full bg-surface-container-low rounded-xl flex items-center justify-center">
          <div className="h-10 w-44 bg-surface-container rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SimulatorSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 animate-pulse"
      aria-busy="true"
      aria-label="Calculating deterministic emissions"
    >
      <div className="h-24 rounded-xl border border-outline-variant bg-surface-container-lowest p-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-xl border border-outline-variant bg-surface-container-lowest" />
        <div className="h-48 rounded-xl border border-outline-variant bg-surface-container-lowest" />
      </div>
    </div>
  );
}
