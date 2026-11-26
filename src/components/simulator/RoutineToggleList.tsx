'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  HouseholdPersona,
  SimulatorToggleId,
  TimeHorizon,
  VehicleSegmentId,
} from '@/types/airqua';
import { SIMULATOR_TOGGLES, TIME_HORIZONS } from '@/lib/emissions/factors';
import { useAirqua } from '@/context/AirquaContext';
import VehicleSegmentSelector from './VehicleSegmentSelector';
import RoutineToggleCard from './RoutineToggleCard';

interface RoutineToggleListProps {
  activeToggles: SimulatorToggleId[];
  onToggle: (id: SimulatorToggleId) => void;
  persona: HouseholdPersona;
  vehicleSegment: VehicleSegmentId;
  onChangeVehicleSegment: (segment: VehicleSegmentId) => void;
  timeHorizon: TimeHorizon;
  onChangeTimeHorizon: (horizon: TimeHorizon) => void;
  commuteDistanceKm: number;
  onChangeDistance: (km: number) => void;
  carpoolOccupancy: number;
  onChangeOccupancy: (occ: number) => void;
  savedErrandKm: number;
  onChangeSavedKm: (km: number) => void;
  onResetToDefaults: () => void;
}

export default function RoutineToggleList({
  activeToggles,
  onToggle,
  persona,
  vehicleSegment,
  onChangeVehicleSegment,
  timeHorizon,
  onChangeTimeHorizon,
  commuteDistanceKm,
  onChangeDistance,
  carpoolOccupancy,
  onChangeOccupancy,
  savedErrandKm,
  onChangeSavedKm,
  onResetToDefaults,
}: RoutineToggleListProps) {
  const { t } = useAirqua();
  const toggleSet = new Set(activeToggles);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[18px] text-on-surface">
            {t.simulator.heading}
          </h2>
          <p className="text-[12px] text-on-surface-variant">{t.simulator.sub}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Simulation Time Horizon"
            className="inline-flex rounded-lg border border-outline-variant p-0.5 bg-surface-container-low"
          >
            {(Object.keys(TIME_HORIZONS) as TimeHorizon[]).map((hId) => {
              const hConfig = TIME_HORIZONS[hId];
              const isSelected = timeHorizon === hId;
              return (
                <button
                  key={hId}
                  type="button"
                  onClick={() => onChangeTimeHorizon(hId)}
                  aria-pressed={isSelected}
                  aria-label={`Time horizon: ${hConfig.label}`}
                  className={`px-3 py-1 text-[11px] font-mono font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="hidden md:inline">{hConfig.label}</span>
                  <span className="md:hidden">
                    {hId === 'DAY' ? '1 Day' : hId === 'WORKWEEK' ? '5 Days' : '22 Days'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onResetToDefaults}
            aria-label="Reset routine swaps to active persona defaults"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container px-3 py-1.5 text-[12px] font-medium text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </div>

      <VehicleSegmentSelector
        vehicleSegment={vehicleSegment}
        onChangeVehicleSegment={onChangeVehicleSegment}
      />

      <div className="grid grid-cols-1 gap-3.5">
        {SIMULATOR_TOGGLES.map((toggle) => (
          <RoutineToggleCard
            key={toggle.id}
            toggle={toggle}
            isActive={toggleSet.has(toggle.id)}
            persona={persona}
            commuteDistanceKm={commuteDistanceKm}
            carpoolOccupancy={carpoolOccupancy}
            savedErrandKm={savedErrandKm}
            onToggle={onToggle}
            onChangeDistance={onChangeDistance}
            onChangeOccupancy={onChangeOccupancy}
            onChangeSavedKm={onChangeSavedKm}
          />
        ))}
      </div>
    </div>
  );
}
