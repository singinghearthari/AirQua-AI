import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWithTimeout, jsonError } from '@/lib/api/http';

export const runtime = 'nodejs';

const CoordinateString = (min: number, max: number, label: string) =>
  z.string({ required_error: `${label} is required` }).transform((val, ctx) => {
    const num = Number(val);
    if (isNaN(num) || num < min || num > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be between ${min} and ${max}`,
      });
      return z.NEVER;
    }
    return num;
  });

const QuerySchema = z.object({
  lat: CoordinateString(-90, 90, 'Latitude'),
  lon: CoordinateString(-180, 180, 'Longitude'),
});

interface LocationPayload {
  name: string;
  region: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

interface CacheEntry {
  data: LocationPayload;
  timestamp: number;
}

interface NominatimResponse {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getFallbackLocation(lat: number, lon: number): LocationPayload {
  return {
    name: 'Current Location',
    region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
    displayName: `Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    latitude: lat,
    longitude: lon,
  };
}

/**
 * Resolves GPS coordinates to an Indian urban neighborhood/city label via OpenStreetMap Nominatim.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parseResult = QuerySchema.safeParse({
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
  });

  if (!parseResult.success) {
    return jsonError('Invalid coordinates', 400, {
      details: parseResult.error.format(),
    });
  }

  const { lat, lon } = parseResult.data;
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const now = Date.now();

  const cached = geocodeCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`;

  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 8000,
      headers: {
        'User-Agent': 'AIRQUA-AI/1.0 (PromptWars Challenge 6; https://aq-ai.vercel.app)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`Reverse geocoding failed: HTTP ${res.status}`);
      return NextResponse.json(getFallbackLocation(lat, lon));
    }

    const json = (await res.json()) as NominatimResponse;
    const address = json.address || {};

    const locality =
      address.suburb ||
      address.neighbourhood ||
      address.residential ||
      address.subdistrict ||
      address.quarter ||
      address.road;

    const municipality =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.city_district ||
      address.county;

    const state = address.state || address.state_district || 'India';

    let name = 'Current Location';
    if (locality && municipality && locality.toLowerCase() !== municipality.toLowerCase()) {
      name = `${locality}, ${municipality}`;
    } else if (locality) {
      name = locality;
    } else if (municipality) {
      name = municipality;
    } else if (state) {
      name = state;
    }

    const region = state || (municipality ? `${municipality}, India` : 'India');
    const locationData: LocationPayload = {
      name,
      region,
      displayName: json.display_name || `${name}, ${region}`,
      latitude: lat,
      longitude: lon,
    };

    geocodeCache.set(cacheKey, { data: locationData, timestamp: now });

    return NextResponse.json(locationData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.warn(`Reverse geocode network error for (${lat}, ${lon}):`, err);
    return NextResponse.json(getFallbackLocation(lat, lon));
  }
}
