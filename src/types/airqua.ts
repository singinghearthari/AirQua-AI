export type AqiScale = 'IN_CPCB' | 'US_EPA';
export type DataFreshness = 'FRESH' | 'STALE' | 'UNAVAILABLE';
export type SupportedLanguage = 'en' | 'ta';
export type HouseholdPersona = 'COMMUTER' | 'FAMILY_KIDS' | 'SENIOR' | 'STUDENT_ATHLETE';

export interface PollutantReading {
  code: 'PM2_5' | 'PM10' | 'O3' | 'NO2' | 'SO2' | 'CO';
  label: string;
  value: number | null;
  unit: 'µg/m³' | 'mg/m³';
  subIndex?: number | null;
}

export type DispersionStatus = 'STAGNANT' | 'MODERATE' | 'DISPERSING' | 'UNKNOWN';

export interface WeatherTelemetry {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  compassDirection: string;
  dispersionStatus: DispersionStatus;
  dispersionNote: string;
}

export interface AirQualitySnapshot {
  location: {
    name: string;
    region?: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  };
  provider: string;
  dataKind: 'OBSERVED' | 'FORECAST';
  observedAt: string | null;
  fetchedAt: string;
  freshness: DataFreshness;
  scale: AqiScale;
  aqiValue: number | null;
  aqiCategory: string;
  dominantPollutant: PollutantReading['code'] | null;
  pollutants: PollutantReading[];
  disclaimer: string;
  weather?: WeatherTelemetry | null;
}

export interface SafeWindowSlot {
  hourISO: string;
  pm25: number | null;
  pm10: number | null;
  aqiEstimate: number | null;
  ventilationStatus: 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
  outdoorStatus: 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
}

export interface DayPeriodPlan {
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  timeRange: string;
  avgPm25: number | null;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
  headline: string;
  personaAction: string;
  whyItMatters: string;
}

export interface SafeWindowSummary {
  bestVentilationWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  bestOutdoorWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  peakSmogWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  dailyPeriods: DayPeriodPlan[];
  hourlySlots: SafeWindowSlot[];
  dataKind: 'FORECAST';
}

export type AIProvider = 'gemini' | 'groq-backup';

export interface RoomScanResult {
  sceneType: 'KITCHEN' | 'BEDROOM' | 'LIVING_AREA' | 'OUTDOOR_SKY' | 'OTHER';
  confidenceNote: string;
  findings: Array<{
    item: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    mechanism: string;
    practicalFix: string;
    estimatedCost: 'FREE' | 'LOW_COST' | 'EQUIPMENT';
  }>;
  quickChecklist: string[];
  sensorBoundaryNotice: string;
  dataKind: 'AI_EXPLANATION';
  aiProvider?: AIProvider;
}

export type TimeHorizon = 'DAY' | 'WORKWEEK' | 'MONTH';

export type VehicleSegmentId =
  | 'SMALL_HATCHBACK'
  | 'MIDSIZE_SEDAN'
  | 'COMPACT_SUV'
  | 'TWO_WHEELER';

export interface VehicleSegmentConfig {
  id: VehicleSegmentId;
  label: string;
  min: number;
  max: number;
  unit: 'kg CO2e/km';
  source: string;
}

export interface ImpactSimulationResult {
  personalExposure: {
    direction: 'LIKELY_LOWER' | 'NEUTRAL' | 'UNCERTAIN';
    summary: string;
    mechanism: string;
    limitation: string;
    peakPm25: number;
    safeWindowPm25: number;
    reductionPct: number;
  };
  emissionsImpact: {
    co2eMinKg: number;
    co2eMaxKg: number;
    baselineMinKg: number;
    baselineMaxKg: number;
    simulatedMinKg: number;
    simulatedMaxKg: number;
    unit: string;
    methodVersion: string;
    formula: string;
    assumptions: string[];
    uncertaintyNote: string;
    timeHorizon: TimeHorizon;
    horizonMultiplier: number;
    equivalenceKmMin: number;
    equivalenceKmMax: number;
  };
  dataKind: 'ESTIMATE';
}

export type SimulatorToggleId =
  | 'SHIFT_OUTDOOR_TO_SAFE_WINDOW'
  | 'CAR_TO_TRANSIT'
  | 'CARPOOL'
  | 'CONSOLIDATE_TRIPS'
  | 'KITCHEN_VENTILATION';

export interface SimulatorToggleConfig {
  id: SimulatorToggleId;
  label: string;
  description: string;
  category: 'ROUTINE' | 'COMMUTE' | 'INDOOR';
  defaultEnabledFor: HouseholdPersona[];
}

export interface SimulatorInputs {
  activeToggles: SimulatorToggleId[];
  persona: HouseholdPersona;
  vehicleSegment?: VehicleSegmentId;
  timeHorizon?: TimeHorizon;
  commuteDistanceKm?: number;
  carpoolOccupancy?: number;
  savedErrandKm?: number;
  currentPeakPm25?: number;
  safeWindowPm25?: number;
}

export interface CityPreset {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  countryCode?: string;
}

export interface EvaluatorPreset {
  id: string;
  label: string;
  city: CityPreset;
  persona: HouseholdPersona;
  scale: AqiScale;
  description: string;
}

interface OpenMeteoHourlyResponse {
  time: string[];
  pm2_5?: (number | null)[];
  pm10?: (number | null)[];
  ozone?: (number | null)[];
  nitrogen_dioxide?: (number | null)[];
  sulphur_dioxide?: (number | null)[];
  carbon_monoxide?: (number | null)[];
  us_aqi?: (number | null)[];
}

export interface OpenMeteoCurrentResponse {
  time: string;
  pm2_5?: number | null;
  pm10?: number | null;
  ozone?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  carbon_monoxide?: number | null;
  us_aqi?: number | null;
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current?: OpenMeteoCurrentResponse;
  hourly?: OpenMeteoHourlyResponse;
}
