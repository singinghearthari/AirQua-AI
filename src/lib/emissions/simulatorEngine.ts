import {
  ImpactSimulationResult,
  SimulatorInputs,
  SimulatorToggleId,
} from '@/types/airqua';
import {
  COLD_START_ERRAND_FACTOR,
  MASS_TRANSIT_FACTOR,
  METHOD_VERSION,
  TIME_HORIZONS,
  VEHICLE_SEGMENTS,
} from './factors';

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
    persona,
    vehicleSegment = 'MIDSIZE_SEDAN',
    timeHorizon = 'DAY',
    commuteDistanceKm = 15, // 2-40 km
    carpoolOccupancy = 2, // 2-4
    savedErrandKm = 5, // 1-15 km
    currentPeakPm25 = 180,
    safeWindowPm25 = 60,
  } = inputs;

  const toggles = new Set<SimulatorToggleId>(activeToggles);
  const vehicle = VEHICLE_SEGMENTS[vehicleSegment] || VEHICLE_SEGMENTS.MIDSIZE_SEDAN;
  const horizon = TIME_HORIZONS[timeHorizon] || TIME_HORIZONS.DAY;
  const multiplier = horizon.days;

  // 1. Calculate Daily Baseline & Avoided Emissions
  let dailyBaselineMin = 0.0;
  let dailyBaselineMax = 0.0;
  let dailySavedMin = 0.0;
  let dailySavedMax = 0.0;

  const formulasUsed: string[] = [];
  const assumptions: string[] = [];

  // Toggle: Personal Vehicle -> Mass Transit
  if (toggles.has('CAR_TO_TRANSIT')) {
    const commuteBaseMin = commuteDistanceKm * vehicle.min;
    const commuteBaseMax = commuteDistanceKm * vehicle.max;
    dailyBaselineMin += commuteBaseMin;
    dailyBaselineMax += commuteBaseMax;

    // Avoided = (vehicleFactor - transitFactor) * distance
    const minSavingPerKm = Math.max(0, vehicle.min - MASS_TRANSIT_FACTOR.max);
    const maxSavingPerKm = Math.max(0, vehicle.max - MASS_TRANSIT_FACTOR.min);

    const tripMin = minSavingPerKm * commuteDistanceKm;
    const tripMax = maxSavingPerKm * commuteDistanceKm;

    dailySavedMin += tripMin;
    dailySavedMax += tripMax;

    formulasUsed.push(
      `${vehicle.label}→Transit: (${vehicle.min}–${vehicle.max} - ${MASS_TRANSIT_FACTOR.min}–${MASS_TRANSIT_FACTOR.max}) × ${commuteDistanceKm} km = [${tripMin.toFixed(2)}–${tripMax.toFixed(2)}] kg CO2e/day`
    );
    assumptions.push(
      `Solo ${vehicle.label} substituted with electric Metro/intracity bus over ${commuteDistanceKm} km roundtrip commute (${vehicle.source}).`
    );
  }

  // Toggle: Carpooling
  if (toggles.has('CARPOOL')) {
    const validOccupancy = Math.max(2, Math.min(carpoolOccupancy, 4));
    const reductionRatio = 1 - 1 / validOccupancy;

    const carpoolBaseMin = commuteDistanceKm * vehicle.min;
    const carpoolBaseMax = commuteDistanceKm * vehicle.max;
    dailyBaselineMin += carpoolBaseMin;
    dailyBaselineMax += carpoolBaseMax;

    const carpoolMin = vehicle.min * reductionRatio * commuteDistanceKm;
    const carpoolMax = vehicle.max * reductionRatio * commuteDistanceKm;

    dailySavedMin += carpoolMin;
    dailySavedMax += carpoolMax;

    formulasUsed.push(
      `Carpool: ${vehicle.label} [${vehicle.min}–${vehicle.max}] × (1 - 1/${validOccupancy}) × ${commuteDistanceKm} km = [${carpoolMin.toFixed(2)}–${carpoolMax.toFixed(2)}] kg CO2e/day`
    );
    assumptions.push(
      `Shared vehicle commute in ${vehicle.label} with ${validOccupancy} occupants cutting per-person vehicle-km by ${(reductionRatio * 100).toFixed(0)}%.`
    );
  }

  // Toggle: Consolidate Trips
  if (toggles.has('CONSOLIDATE_TRIPS')) {
    const errandBaseMin = COLD_START_ERRAND_FACTOR.min * savedErrandKm;
    const errandBaseMax = COLD_START_ERRAND_FACTOR.max * savedErrandKm;
    dailyBaselineMin += errandBaseMin;
    dailyBaselineMax += errandBaseMax;

    const errandMin = errandBaseMin;
    const errandMax = errandBaseMax;

    dailySavedMin += errandMin;
    dailySavedMax += errandMax;

    formulasUsed.push(
      `Trip Consolidation: Cold-start [${COLD_START_ERRAND_FACTOR.min}–${COLD_START_ERRAND_FACTOR.max}] × ${savedErrandKm} km eliminated = [${errandMin.toFixed(2)}–${errandMax.toFixed(2)}] kg CO2e/day`
    );
    assumptions.push(
      `Combining multiple cold-engine errand trips into a single linked loop, avoiding ${savedErrandKm} km of stop-and-go driving.`
    );
  }

  // Multiply by Time Horizon
  const co2eMinKg = Math.round(dailySavedMin * multiplier * 100) / 100;
  const co2eMaxKg = Math.round(dailySavedMax * multiplier * 100) / 100;
  const baselineMinKg = Math.round(dailyBaselineMin * multiplier * 100) / 100;
  const baselineMaxKg = Math.round(dailyBaselineMax * multiplier * 100) / 100;
  const simulatedMinKg = Math.max(0, Math.round((baselineMinKg - co2eMaxKg) * 100) / 100);
  const simulatedMaxKg = Math.max(0, Math.round((baselineMaxKg - co2eMinKg) * 100) / 100);

  // Equivalencies: Average Indian petrol car emits ~0.16 kg CO2e/km
  const avgCarFactor = 0.16;
  const equivalenceKmMin = co2eMinKg > 0 ? Math.round((co2eMinKg / avgCarFactor) * 10) / 10 : 0;
  const equivalenceKmMax = co2eMaxKg > 0 ? Math.round((co2eMaxKg / avgCarFactor) * 10) / 10 : 0;

  // 2. Calculate Personal Exposure Shift (Qualitative tier strictly scoped to today's hourly forecast)
  let exposureDirection: 'LIKELY_LOWER' | 'NEUTRAL' | 'UNCERTAIN' = 'NEUTRAL';
  const exposureMechanisms: string[] = [];
  const exposureSummaries: string[] = [];
  const exposureLimitations: string[] = [];

  const peak = Math.max(1, Math.round(currentPeakPm25));
  const safe = Math.max(1, Math.round(safeWindowPm25));
  const reductionPct = peak > safe ? Math.round(((peak - safe) / peak) * 100) : 0;

  if (toggles.has('SHIFT_OUTDOOR_TO_SAFE_WINDOW')) {
    exposureDirection = 'LIKELY_LOWER';
    const clampedPct = Math.max(20, Math.min(reductionPct, 75));

    exposureSummaries.push(
      `Rescheduling outdoor tasks from peak smog (${peak} µg/m³) to the safe window (${safe} µg/m³) cuts ambient inhaled PM2.5 concentration by ~${clampedPct}%.`
    );
    exposureMechanisms.push(
      'Inhaled particulate dose is a direct product of ambient concentration, exposure duration, and respiration rate during outdoor exertion.'
    );
    exposureLimitations.push(
      'Rescheduling changes individual exposure timing but does not alter airshed emission totals (strictly 0.0 kg CO2e savings).'
    );
  }

  if (toggles.has('KITCHEN_VENTILATION')) {
    exposureDirection = 'LIKELY_LOWER';
    exposureSummaries.push(
      'Running exhaust during tadka/frying and damp mopping minimizes indoor fine-particle spikes.'
    );
    exposureMechanisms.push(
      'Local exhaust ventilation extracts cooking aerosols before room mixing; damp mopping traps dust without dry resuspension.'
    );
    exposureLimitations.push(
      'Visual and behavioral indoor guidance; exact indoor particulate levels require a calibrated physical sensor.'
    );
  }

  if (toggles.has('CAR_TO_TRANSIT')) {
    exposureSummaries.push(
      'Underground and dedicated metro travel isolates passengers from street-level tailpipe exhaust plumes.'
    );
    exposureMechanisms.push(
      'Enclosed air-filtered train cars maintain lower particulate levels than idling in dense roadside traffic.'
    );
  }

  // Default fallback if no toggles selected
  if (toggles.size === 0) {
    exposureDirection = 'NEUTRAL';
    exposureSummaries.push('No behavioral swaps selected. Baseline exposure and emissions remain unchanged.');
    exposureMechanisms.push('Personal exposure matches ambient outdoor conditions.');
    exposureLimitations.push('Select one or more routine swaps above to simulate impact.');
  }

  let primaryFormula =
    formulasUsed.length > 0
      ? formulasUsed.join(' + ')
      : 'ΔE = 0.00 kg CO2e (No motorized vehicle trips substituted)';

  if (multiplier > 1 && formulasUsed.length > 0) {
    primaryFormula = `[Daily: ${formulasUsed.join(' + ')}] × ${multiplier} days (${horizon.label}) = [${co2eMinKg.toFixed(2)}–${co2eMaxKg.toFixed(2)}] ${horizon.unitSuffix}`;
  }

  const primaryUncertainty =
    'Emissions savings are modeled min–max ranges based on WRI India / Shakti Foundation operational benchmarks and ARAI driving cycles. Actual operational savings depend on vehicle condition, stop-and-go congestion, and train occupancy.';

  return {
    personalExposure: {
      direction: exposureDirection,
      summary: exposureSummaries.join(' '),
      mechanism: exposureMechanisms.join(' '),
      limitation: exposureLimitations.join(' '),
      peakPm25: peak,
      safeWindowPm25: safe,
      reductionPct,
    },
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
        assumptions.length > 0 ? assumptions : ['Standard baseline routine with zero active swaps.'],
      uncertaintyNote: primaryUncertainty,
      timeHorizon,
      horizonMultiplier: multiplier,
      equivalenceKmMin,
      equivalenceKmMax,
    },
    dataKind: 'ESTIMATE',
  };
}
