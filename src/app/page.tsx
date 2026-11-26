'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, User, CheckSquare, ArrowRight } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import AqiHeroCard from '@/components/dashboard/AqiHeroCard';
import SafeWindowStrip from '@/components/dashboard/SafeWindowStrip';
import DailyPeriodPlanner from '@/components/dashboard/DailyPeriodPlanner';
import PollutantGrid from '@/components/dashboard/PollutantGrid';
import StaleDataBanner from '@/components/dashboard/StaleDataBanner';
import { DashboardSkeleton } from '@/components/shared/SkeletonLoaders';

export default function DashboardPage() {
  const {
    snapshot,
    isLoadingAir,
    airError,
    refreshAirData,
    openAuthModal,
    savedActions,
    setIsRoutineDrawerOpen,
  } = useAirqua();
  const { user } = useAuth();

  const totalActions = savedActions.length;
  const completedActions = savedActions.filter((a) => a.completed).length;
  const progressPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  // Full error fallback when telemetry fails completely
  if (airError && !snapshot) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-error/40 bg-error-container p-6 text-on-error-container flex flex-col items-start gap-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-6 w-6 text-error shrink-0" aria-hidden="true" />
          <h1 className="font-display font-bold text-[18px]">
            Unable to Load Air Quality Telemetry
          </h1>
        </div>
        <p className="text-[13px] leading-relaxed max-w-xl">
          {airError}. Please verify your network connection or try selecting a different Indian city.
        </p>
        <button
          type="button"
          onClick={refreshAirData}
          className="inline-flex items-center gap-2 rounded-md bg-on-error-container text-error-container px-4 py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Retry Live Sync</span>
        </button>
      </div>
    );
  }

  // Initial loading skeleton state
  if (isLoadingAir && !snapshot) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Honest Stale Data Warning Banner */}
      <StaleDataBanner />

      {/* Compact "Active Today" Routine Summary Card */}
      {totalActions > 0 && (
        <section
          aria-label="Today's Active Routine Progress"
          className="rounded-xl border border-primary/30 bg-primary-container/20 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 rounded-lg bg-primary text-on-primary shrink-0">
              <CheckSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px] text-on-surface">
                  Today&apos;s Routine: {completedActions} of {totalActions} actions done
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {progressPct}%
                </span>
              </div>
              <span className="text-[12px] text-on-surface-variant truncate">
                Saved fixes from Room Scan, Simulator swaps &amp; AI Consultant
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRoutineDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 text-[12px] font-bold shadow-2xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer"
          >
            <span>View Checklist</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      )}

      {/* Centered Guest Sync Callout (shown only when signed out) */}
      {!user && (
        <section
          aria-label="Guest Mode Cloud Sync Callout"
          className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary-container/20 via-surface-container-lowest to-primary-container/20 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-container text-primary shrink-0">
              <User className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col text-[12px] text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                Browsing in Guest Mode (Zero Login Wall)
              </span>
              <span>
                Want to sync your saved routines and room scans across devices with Cloud Firestore?
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="rounded-lg border border-outline-variant bg-surface hover:bg-surface-container px-3.5 py-1.5 text-[12px] font-semibold text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-3.5 py-1.5 text-[12px] font-semibold transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              Sign Up Free
            </button>
          </div>
        </section>
      )}

      {/* Hero AQI Card with strict scale segregation */}
      <section aria-label="Current Air Quality Telemetry">
        <AqiHeroCard />
      </section>

      {/* 24-Hour Safe Window Rolling Average Strip */}
      <section aria-label="24-Hour Safe Ventilation & Errand Timeline">
        <SafeWindowStrip />
      </section>

      {/* Morning / Afternoon / Evening Household Persona Daily Routine */}
      <DailyPeriodPlanner />

      {/* Multi-Pollutant Grid */}
      <PollutantGrid />
    </div>
  );
}
