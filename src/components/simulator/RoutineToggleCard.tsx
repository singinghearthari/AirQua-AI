'use client';

import React from 'react';
import {
  Car,
  Clock,
  Compass,
  Home,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  HouseholdPersona,
  SimulatorToggleConfig,
  SimulatorToggleId,
} from '@/types/airqua';
import RangeSliderControl from './RangeSliderControl';

interface RoutineToggleCardProps {
  toggle: SimulatorToggleConfig;
  isActive: boolean;
  persona: HouseholdPersona;
  commuteDistanceKm: number;
  carpoolOccupancy: number;
  savedErrandKm: number;
  onToggle: (id: SimulatorToggleId) => void;
  onChangeDistance: (km: number) => void;
  onChangeOccupancy: (occ: number) => void;
  onChangeSavedKm: (km: number) => void;
}

function renderCategoryIcon(category: 'ROUTINE' | 'COMMUTE' | 'INDOOR') {
  switch (category) {
    case 'ROUTINE':
      return <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'COMMUTE':
      return <Car className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'INDOOR':
      return <Home className="h-3.5 w-3.5" aria-hidden="true" />;
    default:
      return <Compass className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function getCategoryBadge(category: 'ROUTINE' | 'COMMUTE' | 'INDOOR') {
  switch (category) {
    case 'ROUTINE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900';
    case 'COMMUTE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900';
    case 'INDOOR':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
  }
}

export default function RoutineToggleCard({
  toggle,
  isActive,
  persona,
  commuteDistanceKm,
  carpoolOccupancy,
  savedErrandKm,
  onToggle,
  onChangeDistance,
  onChangeOccupancy,
  onChangeSavedKm,
}: RoutineToggleCardProps) {
  const isPersonaRecommended = toggle.defaultEnabledFor.includes(persona);
  const catBadge = getCategoryBadge(toggle.category);

  return (
    <div
      className={`rounded-xl border transition-all p-4 shadow-xs flex flex-col gap-3 ${
        isActive
          ? 'border-primary/50 bg-primary-container/10 ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider border ${catBadge}`}
            >
              {renderCategoryIcon(toggle.category)}
              {toggle.category}
            </span>

            {isPersonaRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/60 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Recommended Profile Swap
              </span>
            )}
          </div>

          <h3 className="font-semibold text-[15px] text-on-surface leading-snug">
            {toggle.label}
          </h3>
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            {toggle.description}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`Toggle ${toggle.label}`}
          onClick={() => onToggle(toggle.id)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            isActive ? 'bg-primary' : 'bg-outline-variant'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isActive && toggle.id === 'CAR_TO_TRANSIT' && (
        <RangeSliderControl
          label="Daily Commute Distance:"
          valueLabel={`${commuteDistanceKm} km roundtrip`}
          min={2}
          max={40}
          value={commuteDistanceKm}
          ariaLabel="Daily commute distance in kilometers"
          onChange={onChangeDistance}
          minLabel="2 km"
          midLabel="15 km (typical Indian urban commute)"
          maxLabel="40 km"
        />
      )}

      {isActive && toggle.id === 'CARPOOL' && (
        <div className="pt-3 border-t border-outline-variant/60 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-on-surface flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Vehicle Occupants:
            </span>
            <div className="inline-flex rounded-lg border border-outline-variant p-0.5 bg-surface-container-low">
              {[2, 3, 4].map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => onChangeOccupancy(occ)}
                  aria-pressed={carpoolOccupancy === occ}
                  aria-label={`Carpool with ${occ} occupants`}
                  className={`px-3 py-1 text-[11px] font-mono font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                    carpoolOccupancy === occ
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {occ} Riders ({(100 - 100 / occ).toFixed(0)}% cut)
                </button>
              ))}
            </div>
          </div>

          <RangeSliderControl
            label="Shared Route Distance:"
            valueLabel={`${commuteDistanceKm} km`}
            min={2}
            max={40}
            value={commuteDistanceKm}
            ariaLabel="Shared carpool route distance in kilometers"
            onChange={onChangeDistance}
            minLabel="2 km"
            maxLabel="40 km"
          />
        </div>
      )}

      {isActive && toggle.id === 'CONSOLIDATE_TRIPS' && (
        <RangeSliderControl
          label="Avoided Cold-Start Driving:"
          valueLabel={`${savedErrandKm} km eliminated`}
          min={1}
          max={15}
          value={savedErrandKm}
          ariaLabel="Avoided errand driving distance in kilometers"
          onChange={onChangeSavedKm}
          minLabel="1 km"
          midLabel="5 km (2 short trips combined)"
          maxLabel="15 km"
        />
      )}
    </div>
  );
}
