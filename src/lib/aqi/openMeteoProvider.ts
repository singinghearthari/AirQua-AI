import { TIMEOUTS_MS } from '@/lib/config/timeouts';
import { setBoundedMapEntry } from '@/lib/security/boundedMap';
import {
  DataFreshness,
  OpenMeteoAirQualityResponse,
} from '@/types/airqua';

export interface CacheEntry {
  data: OpenMeteoAirQualityResponse;
  timestamp: number;
}

// In-memory 15-minute server cache
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AIR_QUALITY_CACHE = 500;

/**
 * Evaluates the data freshness state based on observation timestamp.
 * - < 60 min: FRESH
 * - 60–180 min: STALE
 * - > 180 min or null: UNAVAILABLE
 */
export function evaluateFreshness(
  observedAtISO: string | null,
  simulateStale: boolean = false
): { freshness: DataFreshness; effectiveObservedAt: string | null } {
  if (simulateStale) {
    // Override to 120 minutes ago (simulates stale demo state)
    const simulatedDate = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    return { freshness: 'STALE', effectiveObservedAt: simulatedDate };
  }

  if (!observedAtISO) {
    return { freshness: 'UNAVAILABLE', effectiveObservedAt: null };
  }

  const observedTime = new Date(observedAtISO).getTime();
  if (isNaN(observedTime)) {
    return { freshness: 'UNAVAILABLE', effectiveObservedAt: null };
  }

  const ageMinutes = (Date.now() - observedTime) / (60 * 1000);

  if (ageMinutes < 0) {
    // Clock skew / slight future timestamp from model: treat as fresh
    return { freshness: 'FRESH', effectiveObservedAt: observedAtISO };
  }
  if (ageMinutes < 60) {
    return { freshness: 'FRESH', effectiveObservedAt: observedAtISO };
  }
  if (ageMinutes <= 180) {
    return { freshness: 'STALE', effectiveObservedAt: observedAtISO };
  }
  return { freshness: 'UNAVAILABLE', effectiveObservedAt: observedAtISO };
}

/**
 * Fetches real-time and forecast air quality data from Open-Meteo Air Quality API.
 * Uses 15-minute in-memory caching to avoid rate limits and optimize server response time.
 */
export async function fetchOpenMeteoAirQuality(
  latitude: number,
  longitude: number
): Promise<OpenMeteoAirQualityResponse> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set(
    'current',
    'pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi'
  );
  url.searchParams.set(
    'hourly',
    'pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS_MS.OPEN_METEO_AIR_QUALITY);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo API returned status ${res.status}`);
    }

    const data: OpenMeteoAirQualityResponse = await res.json();
    setBoundedMapEntry(cache, cacheKey, { data, timestamp: now }, MAX_AIR_QUALITY_CACHE);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // If cache has an expired entry, fall back to it rather than crashing
    if (cached) {
      console.warn(
        `[openMeteoProvider] Fetch failed for (${latitude}, ${longitude}), serving stale cached telemetry:`,
        err instanceof Error ? err.message : err
      );
      return cached.data;
    }
    throw err;
  }
}

/**
 * Clears the in-memory cache (useful for testing).
 */
export function clearOpenMeteoCache(): void {
  cache.clear();
}
