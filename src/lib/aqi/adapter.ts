import {
  AqiScale,
  AirQualitySnapshot,
  HouseholdPersona,
  OpenMeteoAirQualityResponse,
  OpenMeteoCurrentResponse,
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

interface AirQualityAdapterOptions {
  latitude: number;
  longitude: number;
  locationName: string;
  region?: string;
  countryCode?: string;
  scale?: AqiScale;
  persona?: HouseholdPersona;
  simulateStale?: boolean;
}

interface AirQualityResult {
  snapshot: AirQualitySnapshot;
  safeWindows: SafeWindowSummary;
}

function buildPollutantReadings(
  current: OpenMeteoCurrentResponse | undefined
): PollutantReading[] {
  const coMgM3 =
    current?.carbon_monoxide !== undefined && current?.carbon_monoxide !== null
      ? Math.round((current.carbon_monoxide / 1000) * 100) / 100
      : null;

  return [
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
}

function assessAqiByScale(
  scale: AqiScale,
  pollutants: PollutantReading[],
  current: OpenMeteoCurrentResponse | undefined
): {
  aqiValue: number | null;
  aqiCategory: string;
  dominantPollutant: PollutantReading['code'] | null;
  disclaimer: string;
} {
  if (scale === 'IN_CPCB') {
    const cpcbResult = calculateOverallCpcbAqi(pollutants);
    for (const p of pollutants) {
      p.subIndex = cpcbResult.subIndices[p.code];
    }
    return {
      aqiValue: cpcbResult.overallAqi,
      aqiCategory: cpcbResult.category,
      dominantPollutant: cpcbResult.dominantPollutant,
      disclaimer: cpcbResult.disclaimer,
    };
  }

  const aqiValue = current?.us_aqi ?? null;
  return {
    aqiValue,
    aqiCategory: getUsAqiCategory(aqiValue),
    dominantPollutant: 'PM2_5',
    disclaimer:
      'Mapped directly from Open-Meteo US AQI output using official US EPA standards. Never mixed with CPCB thresholds.',
  };
}

function extractHourlySlotInputs(
  hourly: OpenMeteoAirQualityResponse['hourly']
): HourlySlotInput[] {
  if (!hourly?.time) return [];
  const pm25s = hourly.pm2_5 ?? [];
  const pm10s = hourly.pm10 ?? [];
  const usAqis = hourly.us_aqi ?? [];

  return hourly.time.map((timeISO, i) => ({
    timeISO,
    pm25: pm25s[i] ?? null,
    pm10: pm10s[i] ?? null,
    usAqi: usAqis[i] ?? null,
  }));
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
  const { freshness, effectiveObservedAt } = evaluateFreshness(current?.time ?? null, simulateStale);
  const pollutants = buildPollutantReadings(current);
  const scaleAssessment = assessAqiByScale(scale, pollutants, current);

  const snapshot: AirQualitySnapshot = {
    location: { name: locationName, region, countryCode, latitude, longitude },
    provider: 'Open-Meteo Air Quality (Copernicus CAMS & GFS-based)',
    dataKind: 'OBSERVED',
    observedAt: effectiveObservedAt,
    fetchedAt: new Date().toISOString(),
    freshness,
    scale,
    ...scaleAssessment,
    pollutants,
    weather,
  };

  const hourlySlots = extractHourlySlotInputs(rawData.hourly);
  const safeWindows = computeSafeWindowSummary(hourlySlots, persona);

  return { snapshot, safeWindows };
}
