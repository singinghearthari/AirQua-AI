import { describe, it, expect } from 'vitest';
import { runImpactSimulation } from '@/lib/emissions/simulatorEngine';
import {
  getDefaultTogglesForPersona,
  SIMULATOR_TOGGLES,
  TIME_HORIZONS,
  VEHICLE_SEGMENTS,
} from '@/lib/emissions/factors';
import { HouseholdPersona, VehicleSegmentId } from '@/types/airqua';

describe('SimulatorEngine & Strict Exposure vs. Emissions Separation', () => {
  describe('Persona-Aware Default Toggles', () => {
    it('provides tailored default toggles for each HouseholdPersona', () => {
      const personas: HouseholdPersona[] = [
        'COMMUTER',
        'FAMILY_KIDS',
        'SENIOR',
        'STUDENT_ATHLETE',
      ];

      for (const p of personas) {
        const defaults = getDefaultTogglesForPersona(p);
        expect(defaults.length).toBeGreaterThan(0);

        // Commuter defaults should include CAR_TO_TRANSIT
        if (p === 'COMMUTER') {
          expect(defaults).toContain('CAR_TO_TRANSIT');
        }
        // Family with kids should include KITCHEN_VENTILATION and CONSOLIDATE_TRIPS
        if (p === 'FAMILY_KIDS') {
          expect(defaults).toContain('KITCHEN_VENTILATION');
          expect(defaults).toContain('CONSOLIDATE_TRIPS');
        }
        // Senior should include KITCHEN_VENTILATION
        if (p === 'SENIOR') {
          expect(defaults).toContain('KITCHEN_VENTILATION');
        }
      }
    });
  });

  describe('Strict Exposure vs. Emissions Separation', () => {
    it('shifts outdoor errands to safe window: updates Personal Exposure, strictly 0.0 kg CO2e emissions', () => {
      const result = runImpactSimulation({
        activeToggles: ['SHIFT_OUTDOOR_TO_SAFE_WINDOW'],
        persona: 'COMMUTER',
        currentPeakPm25: 200,
        safeWindowPm25: 50,
      });

      // Personal exposure is lower
      expect(result.personalExposure.direction).toBe('LIKELY_LOWER');
      expect(result.personalExposure.summary).toContain('safe window');
      expect(result.personalExposure.limitation).toContain('0.0 kg CO2e');
      expect(result.personalExposure.reductionPct).toBe(75);

      // Emissions MUST strictly be 0.0 kg CO2e
      expect(result.emissionsImpact.co2eMinKg).toBe(0.0);
      expect(result.emissionsImpact.co2eMaxKg).toBe(0.0);
      expect(result.emissionsImpact.formula).toContain('0.00 kg CO2e');
    });

    it('kitchen exhaust + wet mopping: updates Personal Exposure, strictly 0.0 kg CO2e emissions', () => {
      const result = runImpactSimulation({
        activeToggles: ['KITCHEN_VENTILATION'],
        persona: 'FAMILY_KIDS',
      });

      expect(result.personalExposure.direction).toBe('LIKELY_LOWER');
      expect(result.personalExposure.limitation).toContain('sensor');

      // Emissions MUST strictly be 0.0 kg CO2e
      expect(result.emissionsImpact.co2eMinKg).toBe(0.0);
      expect(result.emissionsImpact.co2eMaxKg).toBe(0.0);
    });
  });

  describe('India-Specific Vehicle Segments (WRI India / ARAI / Shakti Foundation)', () => {
    it('computes Small Hatchback Petrol savings accurately', () => {
      const distanceKm = 20;
      const result = runImpactSimulation({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'SMALL_HATCHBACK',
        commuteDistanceKm: distanceKm,
      });

      // Hatchback (0.12–0.14) vs Transit (0.015–0.04)
      // Min: (0.12 - 0.04) * 20 = 1.60 kg
      // Max: (0.14 - 0.015) * 20 = 2.50 kg
      expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(1.6, 2);
      expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(2.5, 2);
      expect(result.emissionsImpact.formula).toContain('Small Hatchback Petrol');
    });

    it('computes Mid-size Sedan Petrol savings accurately', () => {
      const distanceKm = 20;
      const result = runImpactSimulation({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'MIDSIZE_SEDAN',
        commuteDistanceKm: distanceKm,
      });

      // Sedan (0.15–0.18) vs Transit (0.015–0.04)
      // Min: (0.15 - 0.04) * 20 = 2.20 kg
      // Max: (0.18 - 0.015) * 20 = 3.30 kg
      expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(2.2, 2);
      expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(3.3, 2);
    });

    it('computes Compact SUV Petrol savings accurately', () => {
      const distanceKm = 20;
      const result = runImpactSimulation({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'COMPACT_SUV',
        commuteDistanceKm: distanceKm,
      });

      // SUV (0.17–0.20) vs Transit (0.015–0.04)
      // Min: (0.17 - 0.04) * 20 = 2.60 kg
      // Max: (0.20 - 0.015) * 20 = 3.70 kg
      expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(2.6, 2);
      expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(3.7, 2);
    });

    it('computes Two-Wheeler / Scooter savings accurately', () => {
      const distanceKm = 20;
      const result = runImpactSimulation({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'TWO_WHEELER',
        commuteDistanceKm: distanceKm,
      });

      // Two-Wheeler (0.03–0.04) vs Transit (0.015–0.04)
      // Min: Math.max(0, 0.03 - 0.04) * 20 = 0.00 kg
      // Max: (0.04 - 0.015) * 20 = 0.50 kg
      expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(0.0, 2);
      expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(0.5, 2);
    });
  });

  describe('Time Horizon Multipliers (1x Today, 5x Workweek, 22x Month)', () => {
    it('scales emissions proportionally across 1-day, 5-day workweek, and 22-day month', () => {
      const params = {
        activeToggles: ['CAR_TO_TRANSIT' as const],
        persona: 'COMMUTER' as const,
        vehicleSegment: 'MIDSIZE_SEDAN' as const,
        commuteDistanceKm: 20,
      };

      // 1-Day (Today)
      const res1 = runImpactSimulation({ ...params, timeHorizon: 'DAY' });
      expect(res1.emissionsImpact.horizonMultiplier).toBe(1);
      expect(res1.emissionsImpact.co2eMinKg).toBeCloseTo(2.2, 2);
      expect(res1.emissionsImpact.co2eMaxKg).toBeCloseTo(3.3, 2);
      expect(res1.emissionsImpact.unit).toBe('kg CO2e/day');

      // 5-Day Workweek
      const res5 = runImpactSimulation({ ...params, timeHorizon: 'WORKWEEK' });
      expect(res5.emissionsImpact.horizonMultiplier).toBe(5);
      expect(res5.emissionsImpact.co2eMinKg).toBeCloseTo(2.2 * 5, 2);
      expect(res5.emissionsImpact.co2eMaxKg).toBeCloseTo(3.3 * 5, 2);
      expect(res5.emissionsImpact.unit).toContain('5 days');

      // 22-Day Monthly Cycle
      const res22 = runImpactSimulation({ ...params, timeHorizon: 'MONTH' });
      expect(res22.emissionsImpact.horizonMultiplier).toBe(22);
      expect(res22.emissionsImpact.co2eMinKg).toBeCloseTo(2.2 * 22, 2);
      expect(res22.emissionsImpact.co2eMaxKg).toBeCloseTo(3.3 * 22, 2);
      expect(res22.emissionsImpact.unit).toContain('22 days');
    });

    it('keeps Personal Exposure strictly scoped to today’s forecast even when monthly emissions is selected', () => {
      const res = runImpactSimulation({
        activeToggles: ['SHIFT_OUTDOOR_TO_SAFE_WINDOW', 'CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        timeHorizon: 'MONTH',
        currentPeakPm25: 180,
        safeWindowPm25: 60,
      });

      // Emissions scaled by 22x
      expect(res.emissionsImpact.horizonMultiplier).toBe(22);
      expect(res.emissionsImpact.co2eMaxKg).toBeGreaterThan(50);

      // Personal exposure is still single-day hourly forecast
      expect(res.personalExposure.peakPm25).toBe(180);
      expect(res.personalExposure.safeWindowPm25).toBe(60);
      expect(res.personalExposure.reductionPct).toBe(67);
    });
  });

  describe('Carpool & Trip Consolidation Swaps', () => {
    it('carpool: computes savings proportional to vehicle occupancy', () => {
      const distanceKm = 10;
      const result2 = runImpactSimulation({
        activeToggles: ['CARPOOL'],
        persona: 'COMMUTER',
        vehicleSegment: 'MIDSIZE_SEDAN', // 0.15 - 0.18
        commuteDistanceKm: distanceKm,
        carpoolOccupancy: 2, // 50% reduction
      });

      // Min: 0.15 * 0.5 * 10 = 0.75 kg
      // Max: 0.18 * 0.5 * 10 = 0.90 kg
      expect(result2.emissionsImpact.co2eMinKg).toBeCloseTo(0.75, 2);
      expect(result2.emissionsImpact.co2eMaxKg).toBeCloseTo(0.9, 2);
    });

    it('consolidate trips: computes savings from avoided cold-start kilometers', () => {
      const savedKm = 5;
      const result = runImpactSimulation({
        activeToggles: ['CONSOLIDATE_TRIPS'],
        persona: 'FAMILY_KIDS',
        savedErrandKm: savedKm,
      });

      // Cold start factor 0.17 to 0.24 kg/km * 5 = 0.85 to 1.20 kg
      expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(0.85, 2);
      expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(1.2, 2);
      expect(result.emissionsImpact.equivalenceKmMax).toBeGreaterThan(0);
    });

    it('handles zero active toggles gracefully with neutral exposure and 0.0 emissions', () => {
      const result = runImpactSimulation({
        activeToggles: [],
        persona: 'SENIOR',
      });

      expect(result.personalExposure.direction).toBe('NEUTRAL');
      expect(result.emissionsImpact.co2eMinKg).toBe(0.0);
      expect(result.emissionsImpact.co2eMaxKg).toBe(0.0);
    });
  });
});
