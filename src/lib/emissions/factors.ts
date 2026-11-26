import {
  HouseholdPersona,
  SimulatorToggleConfig,
  TimeHorizon,
  VehicleSegmentConfig,
  VehicleSegmentId,
} from '@/types/airqua';

/**
 * Standardized Emission Factors (kg CO2e per km or activity)
 * Documented India-specific operational emission ranges:
 * Sources:
 * - WRI India (World Resources Institute India Sustainable Cities)
 * - Shakti Sustainable Energy Foundation Urban Mobility Benchmarks
 * - Automotive Research Association of India (ARAI) Emission Standards
 * - Central Electricity Authority (CEA) CO2 baseline database
 * - Delhi Metro Rail Corporation (DMRC) Clean Development Mechanism registry
 */

export const VEHICLE_SEGMENTS: Record<VehicleSegmentId, VehicleSegmentConfig> = {
  SMALL_HATCHBACK: {
    id: 'SMALL_HATCHBACK',
    label: 'Small Hatchback Petrol',
    min: 0.12,
    max: 0.14,
    unit: 'kg CO2e/km',
    source:
      'WRI India / Shakti Sustainable Energy Foundation benchmark for small petrol hatchbacks (800–1200cc, e.g. Alto, WagonR, Tiago)',
  },
  MIDSIZE_SEDAN: {
    id: 'MIDSIZE_SEDAN',
    label: 'Mid-size Sedan Petrol',
    min: 0.15,
    max: 0.18,
    unit: 'kg CO2e/km',
    source:
      'WRI India / ARAI urban stop-and-go average for midsize petrol sedans (1200–1500cc, e.g. City, Verna, Dzire)',
  },
  COMPACT_SUV: {
    id: 'COMPACT_SUV',
    label: 'Compact SUV Petrol',
    min: 0.17,
    max: 0.20,
    unit: 'kg CO2e/km',
    source:
      'Shakti Sustainable Energy Foundation / ARAI benchmark for compact urban SUVs & crossovers (e.g. Brezza, Creta, Nexon)',
  },
  TWO_WHEELER: {
    id: 'TWO_WHEELER',
    label: 'Two-Wheeler / Scooter',
    min: 0.03,
    max: 0.04,
    unit: 'kg CO2e/km',
    source:
      'ARAI Indian Driving Cycle for 100–125cc petrol commuter motorcycles & gearless scooters (e.g. Activa, Splendor)',
  },
};

export const MASS_TRANSIT_FACTOR = {
  min: 0.015,
  max: 0.04,
  unit: 'kg CO2e/pax-km',
  source:
    'DMRC / CEA grid-average electric metro rail & high-occupancy CNG intracity bus per passenger-km',
};

export const COLD_START_ERRAND_FACTOR = {
  min: 0.17,
  max: 0.24,
  unit: 'kg CO2e/km',
  source:
    'Short-distance (<5km) cold-engine penalty factor for urban passenger vehicles in stop-and-go traffic',
};

export const TIME_HORIZONS: Record<
  TimeHorizon,
  { id: TimeHorizon; label: string; days: number; unitSuffix: string; desc: string }
> = {
  DAY: {
    id: 'DAY',
    label: 'Today',
    days: 1,
    unitSuffix: 'kg CO2e/day',
    desc: 'Single-day operational emissions',
  },
  WORKWEEK: {
    id: 'WORKWEEK',
    label: 'Workweek (5 days)',
    days: 5,
    unitSuffix: 'kg CO2e (5 days)',
    desc: 'Standard 5-day commuting workweek',
  },
  MONTH: {
    id: 'MONTH',
    label: 'Monthly (22 days)',
    days: 22,
    unitSuffix: 'kg CO2e (22 days)',
    desc: 'Typical 22-workday monthly commuting cycle',
  },
};

export const METHOD_VERSION = 'AIRQUA-EM-2026.2';

/**
 * Master catalog of Simulator Toggles with persona-aware defaults.
 */
export const SIMULATOR_TOGGLES: SimulatorToggleConfig[] = [
  {
    id: 'SHIFT_OUTDOOR_TO_SAFE_WINDOW',
    label: 'Shift Outdoor Walk/Errands to Safe Window',
    description:
      'Reschedule outdoor walks or errands from high-pollution hours to the cleanest 2h window of the day.',
    category: 'ROUTINE',
    defaultEnabledFor: ['COMMUTER', 'FAMILY_KIDS', 'SENIOR', 'STUDENT_ATHLETE'],
  },
  {
    id: 'CAR_TO_TRANSIT',
    label: 'Personal Vehicle → Metro / Mass Transit',
    description:
      'Replace solo vehicle driving with electric Metro rail or shared transit for daily commuting.',
    category: 'COMMUTE',
    defaultEnabledFor: ['COMMUTER'],
  },
  {
    id: 'CARPOOL',
    label: 'Carpool with Colleagues or Neighbors',
    description:
      'Share passenger vehicle occupancy (2–4 people) to split per-person vehicle kilometers.',
    category: 'COMMUTE',
    defaultEnabledFor: [],
  },
  {
    id: 'CONSOLIDATE_TRIPS',
    label: 'Consolidate 2 Short Errands into 1 Trip',
    description:
      'Combine multiple disjoint cold-start trips into a single streamlined loop to eliminate driving kilometers.',
    category: 'ROUTINE',
    defaultEnabledFor: ['FAMILY_KIDS'],
  },
  {
    id: 'KITCHEN_VENTILATION',
    label: 'Kitchen Exhaust During Frying + Wet Mopping',
    description:
      'Run high-efficiency exhaust during tadka/frying and switch from dry sweeping to damp microfiber mopping.',
    category: 'INDOOR',
    defaultEnabledFor: ['FAMILY_KIDS', 'SENIOR'],
  },
];

/**
 * Action checklist metadata for each simulator swap saved into "Today's Plan".
 */
export const SWAP_PLAN_METADATA: Record<
  'SHIFT_OUTDOOR_TO_SAFE_WINDOW' | 'CAR_TO_TRANSIT' | 'CARPOOL' | 'CONSOLIDATE_TRIPS' | 'KITCHEN_VENTILATION',
  { title: string; desc: string }
> = {
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

/**
 * Returns default toggles pre-selected for the given HouseholdPersona.
 */
export function getDefaultTogglesForPersona(persona: HouseholdPersona): string[] {
  return SIMULATOR_TOGGLES.filter((t) => t.defaultEnabledFor.includes(persona)).map((t) => t.id);
}
