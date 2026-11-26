'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { saveActivityHistory } from '@/lib/firebase/userStore';
import {
  HouseholdPersona,
  SimulatorToggleId,
  TimeHorizon,
  VehicleSegmentId,
} from '@/types/airqua';
import { TIMEOUTS_MS } from '@/lib/config/timeouts';
import { getDefaultTogglesForPersona, SWAP_PLAN_METADATA } from '@/lib/emissions/factors';
import { runImpactSimulation } from '@/lib/emissions/simulatorEngine';
import RoutineToggleList from '@/components/simulator/RoutineToggleList';
import DualImpactMeters from '@/components/simulator/DualImpactMeters';
import MathAssumptionsDrawer from '@/components/simulator/MathAssumptionsDrawer';
import SimulatorCommitBar from '@/components/simulator/SimulatorCommitBar';

export default function SimulatorPage() {
  const router = useRouter();
  const { persona, city, snapshot, safeWindows, saveAction, t } = useAirqua();
  const { user } = useAuth();

  const [toggleOverrides, setToggleOverrides] = useState<
    Partial<Record<HouseholdPersona, SimulatorToggleId[]>>
  >({});
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [vehicleSegment, setVehicleSegment] = useState<VehicleSegmentId>('MIDSIZE_SEDAN');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('DAY');
  const [commuteDistanceKm, setCommuteDistanceKm] = useState(15);
  const [carpoolOccupancy, setCarpoolOccupancy] = useState(2);
  const [savedErrandKm, setSavedErrandKm] = useState(5);

  const activeToggles = useMemo(
    () =>
      toggleOverrides[persona] ??
      (getDefaultTogglesForPersona(persona) as SimulatorToggleId[]),
    [toggleOverrides, persona]
  );

  const activeSignature = `${persona}:${activeToggles.join(',')}`;
  const isSavedToPlan = savedSignature === activeSignature;

  const handleToggle = (id: SimulatorToggleId) => {
    setSavedSignature(null);
    const next = activeToggles.includes(id)
      ? activeToggles.filter((tId) => tId !== id)
      : [...activeToggles, id];
    setToggleOverrides((prev) => ({ ...prev, [persona]: next }));
  };

  const handleResetToDefaults = () => {
    setSavedSignature(null);
    setToggleOverrides((prev) => {
      const next = { ...prev };
      delete next[persona];
      return next;
    });
    setVehicleSegment('MIDSIZE_SEDAN');
    setTimeHorizon('DAY');
    setCommuteDistanceKm(15);
    setCarpoolOccupancy(2);
    setSavedErrandKm(5);
  };

  const handleCommitSwapsToPlan = () => {
    activeToggles.forEach((toggleId) => {
      const meta = SWAP_PLAN_METADATA[toggleId];
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
    setSavedSignature(activeSignature);
  };

  const handleAskAIConsultant = () => {
    try {
      localStorage.setItem('airqua_simulator_swaps_v2', JSON.stringify(activeToggles));
    } catch (err) {
      console.warn('[SimulatorPage] Failed to persist simulator swaps before navigation:', err);
    }
    router.push('/assistant');
  };

  const currentPeakPm25 =
    safeWindows?.peakSmogWindow?.avgPm25 ??
    (snapshot?.pollutants.find((p) => p.code === 'PM2_5')?.value || 180);

  const safeWindowPm25 =
    safeWindows?.bestOutdoorWindow?.avgPm25 ??
    safeWindows?.bestVentilationWindow?.avgPm25 ??
    60;

  const simulationResult = useMemo(
    () =>
      runImpactSimulation({
        activeToggles,
        persona,
        vehicleSegment,
        timeHorizon,
        commuteDistanceKm,
        carpoolOccupancy,
        savedErrandKm,
        currentPeakPm25,
        safeWindowPm25,
      }),
    [
      activeToggles,
      persona,
      vehicleSegment,
      timeHorizon,
      commuteDistanceKm,
      carpoolOccupancy,
      savedErrandKm,
      currentPeakPm25,
      safeWindowPm25,
    ]
  );

  useEffect(() => {
    try {
      localStorage.setItem('airqua_simulator_swaps_v2', JSON.stringify(activeToggles));
    } catch (err) {
      console.warn('[SimulatorPage] Failed to persist active simulator swaps:', err);
    }
  }, [activeToggles]);

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
    }, TIMEOUTS_MS.SIMULATION_LOG_DEBOUNCE);

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

      <section aria-label="Dual Impact Output Meters">
        <DualImpactMeters simulation={simulationResult} />
      </section>

      <SimulatorCommitBar
        activeCount={activeToggles.length}
        emissionsImpact={simulationResult.emissionsImpact}
        isSavedToPlan={isSavedToPlan}
        onAskAIConsultant={handleAskAIConsultant}
        onCommitSwaps={handleCommitSwapsToPlan}
      />

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

      <section aria-label="Mathematical Model and Emission Factor Assumptions">
        <MathAssumptionsDrawer simulation={simulationResult} />
      </section>
    </div>
  );
}
