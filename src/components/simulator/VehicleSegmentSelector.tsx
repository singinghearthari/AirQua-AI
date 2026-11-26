'use client';

import React from 'react';
import { Fuel } from 'lucide-react';
import { VehicleSegmentId } from '@/types/airqua';
import { VEHICLE_SEGMENTS } from '@/lib/emissions/factors';

interface VehicleSegmentSelectorProps {
  vehicleSegment: VehicleSegmentId;
  onChangeVehicleSegment: (segment: VehicleSegmentId) => void;
}

export default function VehicleSegmentSelector({
  vehicleSegment,
  onChangeVehicleSegment,
}: VehicleSegmentSelectorProps) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-semibold text-[13px] text-on-surface">
            Vehicle Segment (WRI India / ARAI Benchmarks):
          </span>
        </div>
        <span className="text-[11px] font-mono text-primary font-semibold">
          {VEHICLE_SEGMENTS[vehicleSegment]?.min}–{VEHICLE_SEGMENTS[vehicleSegment]?.max} kg CO2e/km
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(Object.keys(VEHICLE_SEGMENTS) as VehicleSegmentId[]).map((vId) => {
          const vConfig = VEHICLE_SEGMENTS[vId];
          const isSelected = vehicleSegment === vId;

          return (
            <button
              key={vId}
              type="button"
              onClick={() => onChangeVehicleSegment(vId)}
              aria-pressed={isSelected}
              aria-label={`Select vehicle segment: ${vConfig.label}`}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-2xs'
                  : 'border-outline-variant bg-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="font-semibold text-[12px] text-on-surface leading-tight">
                {vConfig.label}
              </span>
              <span className="text-[11px] font-mono text-on-surface-variant">
                {vConfig.min}–{vConfig.max} kg/km
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
