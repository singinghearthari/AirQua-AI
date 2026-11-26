import {
  ImpactSimulationResult,
  SimulatorInputs,
  SimulatorToggleId,
  VehicleSegmentConfig,
} from '@/types/airqua';
import {
  COLD_START_ERRAND_FACTOR,
  MASS_TRANSIT_FACTOR,
  METHOD_VERSION,
  TIME_HORIZONS,
  VEHICLE_SEGMENTS,
} from './factors';

interface DailyEmissionAccumulator {
  dailyBaselineMin: number;
  dailyBaselineMax: number;
  dailySavedMin: number;
  dailySavedMax: number;
  formulasUsed: string[];
  assumptions: string[];
}

function accumulateTransitSwap(
  acc: DailyEmissionAccumulator,
  vehicle: VehicleSegmentConfig,
  commuteDistanceKm: number
): void {
  acc.dailyBaselineMin += commuteDistanceKm * vehicle.min;
  acc.dailyBaselineMax += commuteDistanceKm * vehicle.max;

  const tripMin = Math.max(0, vehicle.min - MASS_TRANSIT_FACTOR.max) * commuteDistanceKm;
  const tripMax = Math.max(0, vehicle.max - MASS_TRANSIT_FACTOR.min) * commuteDistanceKm;

  acc.dailySavedMin += tripMin;
  acc.dailySavedMax += tripMax;

  acc.formulasUsed.push(
    `${vehicle.label}→Transit: (${vehicle.min}–${vehicle.max} - ${MASS_TRANSIT_FACTOR.min}–${MASS_TRANSIT_FACTOR.max}) × ${commuteDistanceKm} km = [${tripMin.toFixed(2)}–${tripMax.toFixed(2)}] kg CO2e/day`
  );
  acc.assumptions.push(
    `Solo ${vehicle.label} substituted with electric Metro/intracity bus over ${commuteDistanceKm} km roundtrip commute (${vehicle.source}).`
  );
}

function accumulateCarpoolSwap(
  acc: DailyEmissionAccumulator,
  vehicle: VehicleSegmentConfig,
  commuteDistanceKm: number,
  carpoolOccupancy: number
): void {
  const validOccupancy = Math.max(2, Math.min(carpoolOccupancy, 4));
  const reductionRatio = 1 - 1 / validOccupancy;

  acc.dailyBaselineMin += commuteDistanceKm * vehicle.min;
  acc.dailyBaselineMax += commuteDistanceKm * vehicle.max;

  const carpoolMin = vehicle.min * reductionRatio * commuteDistanceKm;
  const carpoolMax = vehicle.max * reductionRatio * commuteDistanceKm;

  acc.dailySavedMin += carpoolMin;
  acc.dailySavedMax += carpoolMax;

  acc.formulasUsed.push(
    `Carpool: ${vehicle.label} [${vehicle.min}–${vehicle.max}] × (1 - 1/${validOccupancy}) × ${commuteDistanceKm} km = [${carpoolMin.toFixed(2)}–${carpoolMax.toFixed(2)}] kg CO2e/day`
  );
  acc.assumptions.push(
    `Shared vehicle commute in ${vehicle.label} with ${validOccupancy} occupants cutting per-person vehicle-km by ${(reductionRatio * 100).toFixed(0)}%.`
  );
}

function accumulateErrandConsolidation(
  acc: DailyEmissionAccumulator,
  savedErrandKm: number
): void {
  const errandMin = COLD_START_ERRAND_FACTOR.min * savedErrandKm;
  const errandMax = COLD_START_ERRAND_FACTOR.max * savedErrandKm;

  acc.dailyBaselineMin += errandMin;
  acc.dailyBaselineMax += errandMax;
  acc.dailySavedMin += errandMin;
  acc.dailySavedMax += errandMax;

  acc.formulasUsed.push(
    `Trip Consolidation: Cold-start [${COLD_START_ERRAND_FACTOR.min}–${COLD_START_ERRAND_FACTOR.max}] × ${savedErrandKm} km eliminated = [${errandMin.toFixed(2)}–${errandMax.toFixed(2)}] kg CO2e/day`
  );
  acc.assumptions.push(
    `Combining multiple cold-engine errand trips into a single linked loop, avoiding ${savedErrandKm} km of stop-and-go driving.`
  );
}

function computePersonalExposureShift(
  toggles: Set<SimulatorToggleId>,
  currentPeakPm25: number,
  safeWindowPm25: number
): ImpactSimulationResult['personalExposure'] {
  let direction: 'LIKELY_LOWER' | 'NEUTRAL' | 'UNCERTAIN' = 'NEUTRAL';
  const mechanisms: string[] = [];
  const summaries: string[] = [];
  const limitations: string[] = [];

  const peak = Math.max(1, Math.round(currentPeakPm25));
  const safe = Math.max(1, Math.round(safeWindowPm25));
  const reductionPct = peak > safe ? Math.round(((peak - safe) / peak) * 100) : 0;

  if (toggles.has('SHIFT_OUTDOOR_TO_SAFE_WINDOW')) {
    direction = 'LIKELY_LOWER';
    const clampedPct = Math.max(20, Math.min(reductionPct, 75));
    summaries.push(
      `Rescheduling outdoor tasks from peak smog (${peak} µg/m³) to the safe window (${safe} µg/m³) cuts ambient inhaled PM2.5 concentration by ~${clampedPct}%.`
    );
    mechanisms.push(
      'Inhaled particulate dose is a direct product of ambient concentration, exposure duration, and respiration rate during outdoor exertion.'
    );
    limitations.push(
      'Rescheduling changes individual exposure timing but does not alter airshed emission totals (strictly 0.0 kg CO2e savings).'
    );
  }

  if (toggles.has('KITCHEN_VENTILATION')) {
    direction = 'LIKELY_LOWER';
    summaries.push(
      'Running exhaust during tadka/frying and damp mopping minimizes indoor fine-particle spikes.'
    );
    mechanisms.push(
      'Local exhaust ventilation extracts cooking aerosols before room mixing; damp mopping traps dust without dry resuspension.'
    );
    limitations.push(
      'Visual and behavioral indoor guidance; exact indoor particulate levels require a calibrated physical sensor.'
    );
  }

  if (toggles.has('CAR_TO_TRANSIT')) {
    summaries.push(
      'Underground and dedicated metro travel isolates passengers from street-level tailpipe exhaust plumes.'
    );
    mechanisms.push(
      'Enclosed air-filtered train cars maintain lower particulate levels than idling in dense roadside traffic.'
    );
  }

  if (toggles.size === 0) {
    direction = 'NEUTRAL';
    summaries.push('No behavioral swaps selected. Baseline exposure and emissions remain unchanged.');
    mechanisms.push('Personal exposure matches ambient outdoor conditions.');
    limitations.push('Select one or more routine swaps above to simulate impact.');
  }

  return {
    direction,
    summary: summaries.join(' '),
    mechanism: mechanisms.join(' '),
    limitation: limitations.join(' '),
    peakPm25: peak,
    safeWindowPm25: safe,
    reductionPct,
  };
}

/**
 * Deterministic What-If Impact Simulator Engine.
 *
 * Core Scientific Guardrail:
 * STRICTLY SEPARATES Personal Exposure Shift (qualitative ambient exposure dose)
 * from Emissions Impact (deterministic kg CO2e min-max range with time-horizon scaling).
 *
 * Zero GenAI used here: 100% verifiable mathematical calculation.
 */
export function runImpactSimulation(inputs: SimulatorInputs): ImpactSimulationResult {
  const {
    activeToggles = [],
    vehicleSegment = 'MIDSIZE_SEDAN',
    timeHorizon = 'DAY',
    commuteDistanceKm = 15,
    carpoolOccupancy = 2,
    savedErrandKm = 5,
    currentPeakPm25 = 180,
    safeWindowPm25 = 60,
  } = inputs;

  const toggles = new Set<SimulatorToggleId>(activeToggles);
  const vehicle = VEHICLE_SEGMENTS[vehicleSegment] || VEHICLE_SEGMENTS.MIDSIZE_SEDAN;
  const horizon = TIME_HORIZONS[timeHorizon] || TIME_HORIZONS.DAY;
  const multiplier = horizon.days;

  const acc: DailyEmissionAccumulator = {
    dailyBaselineMin: 0,
    dailyBaselineMax: 0,
    dailySavedMin: 0,
    dailySavedMax: 0,
    formulasUsed: [],
    assumptions: [],
  };

  if (toggles.has('CAR_TO_TRANSIT')) accumulateTransitSwap(acc, vehicle, commuteDistanceKm);
  if (toggles.has('CARPOOL')) accumulateCarpoolSwap(acc, vehicle, commuteDistanceKm, carpoolOccupancy);
  if (toggles.has('CONSOLIDATE_TRIPS')) accumulateErrandConsolidation(acc, savedErrandKm);

  const co2eMinKg = Math.round(acc.dailySavedMin * multiplier * 100) / 100;
  const co2eMaxKg = Math.round(acc.dailySavedMax * multiplier * 100) / 100;
  const baselineMinKg = Math.round(acc.dailyBaselineMin * multiplier * 100) / 100;
  const baselineMaxKg = Math.round(acc.dailyBaselineMax * multiplier * 100) / 100;
  const simulatedMinKg = Math.max(0, Math.round((baselineMinKg - co2eMaxKg) * 100) / 100);
  const simulatedMaxKg = Math.max(0, Math.round((baselineMaxKg - co2eMinKg) * 100) / 100);

  const avgCarFactor = 0.16;
  const equivalenceKmMin = co2eMinKg > 0 ? Math.round((co2eMinKg / avgCarFactor) * 10) / 10 : 0;
  const equivalenceKmMax = co2eMaxKg > 0 ? Math.round((co2eMaxKg / avgCarFactor) * 10) / 10 : 0;

  let primaryFormula =
    acc.formulasUsed.length > 0
      ? acc.formulasUsed.join(' + ')
      : 'ΔE = 0.00 kg CO2e (No motorized vehicle trips substituted)';

  if (multiplier > 1 && acc.formulasUsed.length > 0) {
    primaryFormula = `[Daily: ${acc.formulasUsed.join(' + ')}] × ${multiplier} days (${horizon.label}) = [${co2eMinKg.toFixed(2)}–${co2eMaxKg.toFixed(2)}] ${horizon.unitSuffix}`;
  }

  return {
    personalExposure: computePersonalExposureShift(toggles, currentPeakPm25, safeWindowPm25),
    emissionsImpact: {
      co2eMinKg,
      co2eMaxKg,
      baselineMinKg,
      baselineMaxKg,
      simulatedMinKg,
      simulatedMaxKg,
      unit: horizon.unitSuffix,
      methodVersion: METHOD_VERSION,
      formula: primaryFormula,
      assumptions:
        acc.assumptions.length > 0
          ? acc.assumptions
          : ['Standard baseline routine with zero active swaps.'],
      uncertaintyNote:
        'Emissions savings are modeled min–max ranges based on WRI India / Shakti Foundation operational benchmarks and ARAI driving cycles. Actual operational savings depend on vehicle condition, stop-and-go congestion, and train occupancy.',
      timeHorizon,
      horizonMultiplier: multiplier,
      equivalenceKmMin,
      equivalenceKmMax,
    },
    dataKind: 'ESTIMATE',
  };
}
