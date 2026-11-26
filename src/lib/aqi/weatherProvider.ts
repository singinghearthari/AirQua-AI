import { TIMEOUTS_MS } from '@/lib/config/timeouts';
import { setBoundedMapEntry } from '@/lib/security/boundedMap';
import { DispersionStatus, WeatherTelemetry } from '@/types/airqua';

interface RawOpenMeteoWeatherResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

/**
 * Deterministically computes smog dispersion status based on near-surface wind speed (10m).
 * Zero GenAI used here: 100% deterministic physical threshold classification.
 *
 * Thresholds:
 * - < 6 km/h: STAGNANT (inversions and stagnant air trap particulates in the breathing zone)
 * - 6-15 km/h: MODERATE (light to moderate advection; steady mixing)
 * - > 15 km/h: DISPERSING (stronger airflow actively ventilates surface smog)
 */
export function computeDispersionStatus(windSpeedKmh: number | null | undefined): {
  status: DispersionStatus;
  note: string;
} {
  if (
    windSpeedKmh === null ||
    windSpeedKmh === undefined ||
    typeof windSpeedKmh !== 'number' ||
    isNaN(windSpeedKmh) ||
    windSpeedKmh < 0
  ) {
    return {
      status: 'UNKNOWN',
      note: 'Wind and dispersion telemetry unavailable',
    };
  }

  if (windSpeedKmh < 6) {
    return {
      status: 'STAGNANT',
      note: 'Low wind traps pollutants near ground level',
    };
  }

  if (windSpeedKmh <= 15) {
    return {
      status: 'MODERATE',
      note: 'Light breeze; gradual pollutant mixing',
    };
  }

  return {
    status: 'DISPERSING',
    note: 'Stronger wind helping disperse surface smog',
  };
}

/**
 * Converts 0-360 degrees wind direction into an 8-point compass label.
 */
export function getCompassDirection(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return '—';
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return compassPoints[index];
}

// 15-minute in-memory cache to respect Open-Meteo free tier rate limits
interface CachedWeather {
  data: WeatherTelemetry;
  timestamp: number;
}
const weatherCache = new Map<string, CachedWeather>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_WEATHER_CACHE = 500;

/**
 * Fetches live weather telemetry from Open-Meteo Forecast API.
 * Degrades gracefully to null on network or parse failures.
 */
export async function fetchLiveWeather(
  latitude: number,
  longitude: number
): Promise<WeatherTelemetry | null> {
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS_MS.WEATHER_TELEMETRY);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Weather fetch failed for (${latitude}, ${longitude}): HTTP ${res.status}`);
      return cached ? cached.data : null;
    }

    const json = (await res.json()) as RawOpenMeteoWeatherResponse;
    const current = json.current;

    if (!current) {
      return cached ? cached.data : null;
    }

    const windSpeedKmh =
      typeof current.wind_speed_10m === 'number'
        ? Math.round(current.wind_speed_10m * 10) / 10
        : 0;
    const windDirectionDeg =
      typeof current.wind_direction_10m === 'number'
        ? Math.round(current.wind_direction_10m)
        : 0;
    const temperatureC =
      typeof current.temperature_2m === 'number'
        ? Math.round(current.temperature_2m * 10) / 10
        : 25;
    const humidityPct =
      typeof current.relative_humidity_2m === 'number'
        ? Math.round(current.relative_humidity_2m)
        : 50;

    const { status, note } = computeDispersionStatus(windSpeedKmh);
    const compassDirection = getCompassDirection(windDirectionDeg);

    const telemetry: WeatherTelemetry = {
      temperatureC,
      humidityPct,
      windSpeedKmh,
      windDirectionDeg,
      compassDirection,
      dispersionStatus: status,
      dispersionNote: note,
    };

    setBoundedMapEntry(weatherCache, cacheKey, { data: telemetry, timestamp: now }, MAX_WEATHER_CACHE);
    return telemetry;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Live weather telemetry degraded gracefully for (${latitude}, ${longitude}):`, err);
    return cached ? cached.data : null;
  }
}
