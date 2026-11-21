'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  Sparkles,
  MapPin,
  BookmarkPlus,
  Check,
  Bot,
  ArrowRight,
  TrendingDown,
  Leaf,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { saveActivityHistory } from '@/lib/firebase/userStore';
import {
  HouseholdPersona,
  SimulatorToggleId,
  TimeHorizon,
  VehicleSegmentId,
} from '@/types/airqua';
import { getDefaultTogglesForPersona } from '@/lib/emissions/factors';
import { runImpactSimulation } from '@/lib/emissions/simulatorEngine';
import RoutineToggleList from '@/components/simulator/RoutineToggleList';
import DualImpactMeters from '@/components/simulator/DualImpactMeters';
import MathAssumptionsDrawer from '@/components/simulator/MathAssumptionsDrawer';

export default function SimulatorPage() {
  const router = useRouter();
  const { persona, city, snapshot, safeWindows, saveAction, t } = useAirqua();
  const { user } = useAuth();
  const [isSavedToPlan, setIsSavedToPlan] = useState(false);

  // Initialize toggles from persona defaults and track previous persona for clean adjustment
  const [prevPersona, setPrevPersona] = useState(persona);
  const [activeToggles, setActiveToggles] = useState<SimulatorToggleId[]>(() =>
    getDefaultTogglesForPersona(persona) as SimulatorToggleId[]
  );

  // Vehicle segment & time horizon state
  const [vehicleSegment, setVehicleSegment] = useState<VehicleSegmentId>('MIDSIZE_SEDAN');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('DAY');

  // Input slider states
  const [commuteDistanceKm, setCommuteDistanceKm] = useState(15);
  const [carpoolOccupancy, setCarpoolOccupancy] = useState(2);
  const [savedErrandKm, setSavedErrandKm] = useState(5);

  // Sync default toggles whenever the user switches persona in the global header
  if (persona !== prevPersona) {
    setPrevPersona(persona);
    setActiveToggles(getDefaultTogglesForPersona(persona) as SimulatorToggleId[]);
    setIsSavedToPlan(false);
  }

  const handleToggle = (id: SimulatorToggleId) => {
    setIsSavedToPlan(false);
    setActiveToggles((prev) => {
      if (prev.includes(id)) {
        return prev.filter((tId) => tId !== id);
      }
      return [...prev, id];
    });
  };

  const handleResetToDefaults = () => {
    setIsSavedToPlan(false);
    setActiveToggles(getDefaultTogglesForPersona(persona) as SimulatorToggleId[]);
    setVehicleSegment('MIDSIZE_SEDAN');
    setTimeHorizon('DAY');
    setCommuteDistanceKm(15);
    setCarpoolOccupancy(2);
    setSavedErrandKm(5);
  };

  const handleCommitSwapsToPlan = () => {
    const titles: Record<SimulatorToggleId, { title: string; desc: string }> = {
      SHIFT_OUTDOOR_TO_SAFE_WINDOW: {
        title: 'Shift Outdoor Tasks to Safe Window',
        desc: 'Reschedule jogging/errands to the verified 24h safe window to avoid peak smog.',
      },
      CAR_TO_TRANSIT: {
        title: 'Switch Solo Car Commute to Metro',
        desc: 'Take mass transit to isolate from roadside plumes and reduce tailpipe CO2e.',
      },
      CARPOOL: {
        title: 'Carpool / Shared Commute',
        desc: 'Split vehicle trips with 2+ occupants to cut per-capita emissions.',
      },
      CONSOLIDATE_TRIPS: {
        title: 'Consolidate Weekly Errands',
        desc: 'Group neighborhood shopping to avoid cold-start vehicle trips.',
      },
      KITCHEN_VENTILATION: {
        title: 'Kitchen Exhaust During High-Heat Cooking',
        desc: 'Run range hood/exhaust fan during tadka/frying to remove indoor particulate bursts.',
      },
    };

    activeToggles.forEach((toggleId) => {
      const meta = titles[toggleId];
      if (meta) {
        saveAction({
          headline: `[${city.name}] ${meta.title}`,
          action: meta.desc,
          period: 'SIMULATOR',
          completed: false,
          sourceScreen: 'SIMULATOR',
        });
      }
    });

    setIsSavedToPlan(true);
  };

  const handleAskAIConsultant = () => {
    try {
      localStorage.setItem('airqua_simulator_swaps_v2', JSON.stringify(activeToggles));
    } catch {}
    router.push('/assistant');
  };

  // Extract live local PM2.5 metrics if available for realistic exposure scaling
  const currentPeakPm25 =
    safeWindows?.peakSmogWindow?.avgPm25 ??
    (snapshot?.pollutants.find((p) => p.code === 'PM2_5')?.value || 180);

  const safeWindowPm25 =
    safeWindows?.bestOutdoorWindow?.avgPm25 ??
    safeWindows?.bestVentilationWindow?.avgPm25 ??
    60;

  // 100% deterministic mathematical execution (0ms latency, zero LLM guesswork)
  const simulationResult = useMemo(() => {
    return runImpactSimulation({
      activeToggles,
      persona,
      vehicleSegment,
      timeHorizon,
      commuteDistanceKm,
      carpoolOccupancy,
      savedErrandKm,
      currentPeakPm25,
      safeWindowPm25,
    });
  }, [
    activeToggles,
    persona,
    vehicleSegment,
    timeHorizon,
    commuteDistanceKm,
    carpoolOccupancy,
    savedErrandKm,
    currentPeakPm25,
    safeWindowPm25,
  ]);

  // Sync simulator routine toggles to localStorage for cross-screen AI consultant awareness
  useEffect(() => {
    try {
      localStorage.setItem('airqua_simulator_swaps_v2', JSON.stringify(activeToggles));
    } catch {}
  }, [activeToggles]);

  // Record simulation activity snapshot in Firestore when user is signed in (debounced)
  useEffect(() => {
    if (!user?.uid || activeToggles.length === 0) return;
    const timer = setTimeout(() => {
      saveActivityHistory(user.uid, {
        type: 'SIMULATION',
        summary: `${activeToggles.length} routines active (${simulationResult.personalExposure.direction})`,
        details: {
          toggles: activeToggles,
          vehicleSegment,
          timeHorizon,
          exposureDirection: simulationResult.personalExposure.direction,
          co2eMinKg: simulationResult.emissionsImpact.co2eMinKg,
          co2eMaxKg: simulationResult.emissionsImpact.co2eMaxKg,
        },
      }).catch((err) => console.warn('Failed to record simulation activity:', err));
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    user?.uid,
    activeToggles,
    vehicleSegment,
    timeHorizon,
    simulationResult.personalExposure.direction,
    simulationResult.emissionsImpact.co2eMinKg,
    simulationResult.emissionsImpact.co2eMaxKg,
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Active Profile and Location Context */}
      <section
        aria-label="Simulator Overview"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-container text-primary">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display font-bold text-[22px] sm:text-[24px] text-on-surface tracking-tight">
              Interactive &ldquo;What-If&rdquo; Routine Simulator
            </h1>
          </div>
          <p className="text-[13px] text-on-surface-variant max-w-2xl leading-relaxed">
            Test daily routine swaps to see their separate effects: protect your family&apos;s lungs
            (Personal Exposure Shift) and reduce community carbon emissions (Emissions Impact).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-medium text-on-surface border border-outline-variant">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {city.name}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-medium text-on-primary-container border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t.personas[persona] || persona}
          </span>
        </div>
      </section>

      {/* 2. Dual Impact Meters (Card A & Card B Strictly Separate) */}
      <section aria-label="Dual Impact Output Meters">
        <DualImpactMeters simulation={simulationResult} />
      </section>

      {/* 3. Routine Action Bar: Commit Swaps & Ask AI Consultant */}
      {activeToggles.length > 0 && (
        <section
          aria-label="Commit Routine Swaps to Today's Plan"
          className="rounded-xl border border-primary/30 bg-primary-container/20 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex flex-col text-center sm:text-left">
            <span className="font-bold text-[14px] text-on-surface flex items-center gap-2 justify-center sm:justify-start">
              <span>Commit to these {activeToggles.length} Simulated Swaps?</span>
              {simulationResult.emissionsImpact.co2eMaxKg > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20">
                  <Leaf className="h-3 w-3" aria-hidden="true" />
                  {simulationResult.emissionsImpact.co2eMinKg.toFixed(2)}–{simulationResult.emissionsImpact.co2eMaxKg.toFixed(2)} {simulationResult.emissionsImpact.unit} saved
                </span>
              )}
            </span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">
              Add to Today&apos;s Saved Routine checklist to track your personal exposure and emissions progress.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Ask AI Consultant Button */}
            <button
              type="button"
              onClick={handleAskAIConsultant}
              aria-label="Ask AI Consultant about this routine plan in assistant"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-surface hover:bg-surface-container px-3.5 py-2 text-[12px] font-semibold text-primary transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>Ask AI Consultant</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>

            {/* Commit Swaps to Today's Plan Button */}
            <button
              type="button"
              onClick={handleCommitSwapsToPlan}
              disabled={isSavedToPlan}
              aria-label="Commit swaps to today's plan checklist"
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                isSavedToPlan
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-primary hover:bg-primary/90 text-on-primary'
              }`}
            >
              {isSavedToPlan ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Added to Routine!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Commit Swaps to Today&apos;s Plan</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* 4. Routine Toggle List */}
      <section aria-label="Routine Swaps Selection and Parameters">
        <RoutineToggleList
          activeToggles={activeToggles}
          onToggle={handleToggle}
          persona={persona}
          vehicleSegment={vehicleSegment}
          onChangeVehicleSegment={setVehicleSegment}
          timeHorizon={timeHorizon}
          onChangeTimeHorizon={setTimeHorizon}
          commuteDistanceKm={commuteDistanceKm}
          onChangeDistance={setCommuteDistanceKm}
          carpoolOccupancy={carpoolOccupancy}
          onChangeOccupancy={setCarpoolOccupancy}
          savedErrandKm={savedErrandKm}
          onChangeSavedKm={setSavedErrandKm}
          onResetToDefaults={handleResetToDefaults}
        />
      </section>

      {/* 5. Accessible Math & Assumptions Drawer */}
      <section aria-label="Mathematical Model and Emission Factor Assumptions">
        <MathAssumptionsDrawer simulation={simulationResult} />
      </section>
    </div>
  );
}
