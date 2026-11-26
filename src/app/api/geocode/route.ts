import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, fetchWithTimeout, jsonError } from '@/lib/api/http';
import { TIMEOUTS_MS } from '@/lib/config/timeouts';
import { setBoundedMapEntry } from '@/lib/security/boundedMap';

export const runtime = 'nodejs';

interface CacheEntry {
  results: CityResult[];
  timestamp: number;
}

interface CityResult {
  name: string;
  region?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodeItem {
  name: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeItem[];
}

const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GEOCODE_CACHE = 500;

const INDIAN_FALLBACK_CITIES: CityResult[] = [
  { name: 'Delhi', region: 'National Capital Territory of Delhi', countryCode: 'IN', latitude: 28.6139, longitude: 77.209 },
  { name: 'Noida', region: 'Uttar Pradesh', countryCode: 'IN', latitude: 28.5355, longitude: 77.391 },
  { name: 'Gurugram', region: 'Haryana', countryCode: 'IN', latitude: 28.4595, longitude: 77.0266 },
  { name: 'Mumbai', region: 'Maharashtra', countryCode: 'IN', latitude: 19.076, longitude: 72.8777 },
  { name: 'Kolkata', region: 'West Bengal', countryCode: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Bengaluru', region: 'Karnataka', countryCode: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Hyderabad', region: 'Telangana', countryCode: 'IN', latitude: 17.385, longitude: 78.4867 },
  { name: 'Ahmedabad', region: 'Gujarat', countryCode: 'IN', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Pune', region: 'Maharashtra', countryCode: 'IN', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Lucknow', region: 'Uttar Pradesh', countryCode: 'IN', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Patna', region: 'Bihar', countryCode: 'IN', latitude: 25.5941, longitude: 85.1376 },
  { name: 'Chandigarh', region: 'Chandigarh', countryCode: 'IN', latitude: 30.7333, longitude: 76.7794 },
  { name: 'Jaipur', region: 'Rajasthan', countryCode: 'IN', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Coimbatore', region: 'Tamil Nadu', countryCode: 'IN', latitude: 11.0168, longitude: 76.9558 },
  { name: 'Madurai', region: 'Tamil Nadu', countryCode: 'IN', latitude: 9.9252, longitude: 78.1198 },
];

const QuerySchema = z.object({
  q: z
    .string()
    .min(2, 'Query must be at least 2 characters')
    .max(60, 'Query cannot exceed 60 characters')
    .transform((val) => val.trim()),
});

/**
 * Searches pan-India and global cities via Open-Meteo Geocoding with a 24h cache
 * and offline Indian city catalog fallback.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 120, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const parseResult = QuerySchema.safeParse({ q: searchParams.get('q') });

  if (!parseResult.success) {
    return jsonError('Invalid search query', 400, {
      details: parseResult.error.format(),
    });
  }

  const query = parseResult.data.q;
  const cacheKey = query.toLowerCase();
  const now = Date.now();

  const cached = geocodeCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results });
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '10');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const res = await fetchWithTimeout(url.toString(), {
      timeoutMs: TIMEOUTS_MS.GEOCODE_SEARCH,
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = (await res.json()) as OpenMeteoGeocodeResponse;
      const rawResults = data.results || [];

      const results: CityResult[] = rawResults.map((item) => ({
        name: item.name,
        region: item.admin1 || item.admin2 || item.country,
        countryCode: item.country_code ? item.country_code.toUpperCase() : 'IN',
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      results.sort((a, b) => {
        if (a.countryCode === 'IN' && b.countryCode !== 'IN') return -1;
        if (a.countryCode !== 'IN' && b.countryCode === 'IN') return 1;
        return 0;
      });

      setBoundedMapEntry(geocodeCache, cacheKey, { results, timestamp: now }, MAX_GEOCODE_CACHE);
      return NextResponse.json({ results });
    }
  } catch (error) {
    console.warn('Open-Meteo geocoding fetch failed, falling back to local dataset:', error);
  }

  const lowerQ = query.toLowerCase();
  const fallbackMatches = INDIAN_FALLBACK_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQ) ||
      (c.region && c.region.toLowerCase().includes(lowerQ))
  );

  setBoundedMapEntry(
    geocodeCache,
    cacheKey,
    { results: fallbackMatches, timestamp: now },
    MAX_GEOCODE_CACHE
  );
  return NextResponse.json({ results: fallbackMatches });
}
