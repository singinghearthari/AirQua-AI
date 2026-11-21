import {
  AqiScale,
  AirQualitySnapshot,
  HouseholdPersona,
  PollutantReading,
  SafeWindowSummary,
  WeatherTelemetry,
} from '@/types/airqua';
import { calculateOverallCpcbAqi } from './cpcbCalculator';
import { getUsAqiCategory } from './usAqiMapper';
import {
  evaluateFreshness,
  fetchOpenMeteoAirQuality,
} from './openMeteoProvider';
import { fetchLiveWeather } from './weatherProvider';
import {
  computeSafeWindowSummary,
  HourlySlotInput,
} from './safeWindowEngine';

export interface AirQualityAdapterOptions {
  latitude: number;
  longitude: number;
  locationName: string;
  region?: string;
  countryCode?: string;
  scale?: AqiScale;
  persona?: HouseholdPersona;
  simulateStale?: boolean;
}

export interface AirQualityResult {
  snapshot: AirQualitySnapshot;
  safeWindows: SafeWindowSummary;
}

/**
 * Adapts raw Open-Meteo Air Quality API output into strictly typed,
 * scale-isolated AIRQUA data structures.
 */
export async function getAirQualityData(
  options: AirQualityAdapterOptions
): Promise<AirQualityResult> {
  const {
    latitude,
    longitude,
    locationName,
    region,
    countryCode = 'IN',
    scale = 'IN_CPCB',
    persona = 'COMMUTER',
    simulateStale = false,
  } = options;

  const [airSettled, weatherSettled] = await Promise.allSettled([
    fetchOpenMeteoAirQuality(latitude, longitude),
    fetchLiveWeather(latitude, longitude),
  ]);

  if (airSettled.status === 'rejected') {
    throw airSettled.reason;
  }

  const rawData = airSettled.value;
  const weather: WeatherTelemetry | null =
    weatherSettled.status === 'fulfilled' ? weatherSettled.value : null;

  const current = rawData.current;
  const rawObservedAt = current?.time ?? null;
  const { freshness, effectiveObservedAt } = evaluateFreshness(rawObservedAt, simulateStale);
  const fetchedAt = new Date().toISOString();

  // Convert Open-Meteo raw CO (ug/m3) to mg/m3 for standard CPCB indexing
  const coMgM3 =
    current?.carbon_monoxide !== undefined && current?.carbon_monoxide !== null
      ? Math.round((current.carbon_monoxide / 1000) * 100) / 100
      : null;

  // Pollutant readings array
  const pollutants: PollutantReading[] = [
    {
      code: 'PM2_5',
      label: 'PM2.5 (Fine Particles)',
      value: current?.pm2_5 ?? null,
      unit: 'µg/m³',
    },
    {
      code: 'PM10',
      label: 'PM10 (Coarse Dust)',
      value: current?.pm10 ?? null,
      unit: 'µg/m³',
    },
    {
      code: 'NO2',
      label: 'NO₂ (Nitrogen Dioxide)',
      value: current?.nitrogen_dioxide ?? null,
      unit: 'µg/m³',
    },
    {
      code: 'SO2',
      label: 'SO₂ (Sulphur Dioxide)',
      value: current?.sulphur_dioxide ?? null,
      unit: 'µg/m³',
    },
    {
      code: 'O3',
      label: 'O₃ (Surface Ozone)',
      value: current?.ozone ?? null,
      unit: 'µg/m³',
    },
    {
      code: 'CO',
      label: 'CO (Carbon Monoxide)',
      value: coMgM3,
      unit: 'mg/m³',
    },
  ];

  let aqiValue: number | null = null;
  let aqiCategory = 'Unknown';
  let dominantPollutant: PollutantReading['code'] | null = null;
  let disclaimer = '';

  if (scale === 'IN_CPCB') {
    const cpcbResult = calculateOverallCpcbAqi(pollutants);
    aqiValue = cpcbResult.overallAqi;
    aqiCategory = cpcbResult.category;
    dominantPollutant = cpcbResult.dominantPollutant;
    disclaimer = cpcbResult.disclaimer;

    // Attach sub-indices to pollutants
    for (const p of pollutants) {
      p.subIndex = cpcbResult.subIndices[p.code];
    }
  } else {
    // US_EPA Scale
    aqiValue = current?.us_aqi ?? null;
    aqiCategory = getUsAqiCategory(aqiValue);
    dominantPollutant = 'PM2_5'; // Typically dominant in urban winter settings
    disclaimer =
      'Mapped directly from Open-Meteo US AQI output using official US EPA standards. Never mixed with CPCB thresholds.';
  }

  const snapshot: AirQualitySnapshot = {
    location: {
      name: locationName,
      region,
      countryCode,
      latitude,
      longitude,
    },
    provider: 'Open-Meteo Air Quality (Copernicus CAMS & GFS-based)',
    dataKind: 'OBSERVED',
    observedAt: effectiveObservedAt,
    fetchedAt,
    freshness,
    scale,
    aqiValue,
    aqiCategory,
    dominantPollutant,
    pollutants,
    disclaimer,
    weather,
  };

  // Build hourly slot input for SafeWindowEngine
  const hourlySlots: HourlySlotInput[] = [];
  if (rawData.hourly && rawData.hourly.time) {
    const times = rawData.hourly.time;
    const pm25s = rawData.hourly.pm2_5 ?? [];
    const pm10s = rawData.hourly.pm10 ?? [];
    const usAqis = rawData.hourly.us_aqi ?? [];

    for (let i = 0; i < times.length; i++) {
      hourlySlots.push({
        timeISO: times[i],
        pm25: pm25s[i] ?? null,
        pm10: pm10s[i] ?? null,
        usAqi: usAqis[i] ?? null,
      });
    }
  }

  const safeWindows = computeSafeWindowSummary(hourlySlots, persona);

  return {
    snapshot,
    safeWindows,
  };
}
