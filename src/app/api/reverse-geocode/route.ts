import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  lat: z
    .string({ required_error: 'Latitude is required' })
    .transform((val, ctx) => {
      const num = Number(val);
      if (isNaN(num) || num < -90 || num > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Latitude must be between -90 and 90',
        });
        return z.NEVER;
      }
      return num;
    }),
  lon: z
    .string({ required_error: 'Longitude is required' })
    .transform((val, ctx) => {
      const num = Number(val);
      if (isNaN(num) || num < -180 || num > 180) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Longitude must be between -180 and 180',
        });
        return z.NEVER;
      }
      return num;
    }),
});

interface CacheEntry {
  data: {
    name: string;
    region: string;
    displayName: string;
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

// 24-hour server in-memory cache
const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parseResult = QuerySchema.safeParse({
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid coordinates', details: parseResult.error.format() },
      { status: 400 }
    );
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AIRQUA-AI/1.0 (PromptWars Challenge 6; https://airqua-ai.vercel.app)',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Reverse geocoding failed: HTTP ${res.status}`);
      return NextResponse.json(getFallbackLocation(lat, lon));
    }

    const json = await res.json();
    const address = json.address || {};

    // Prioritize neighborhood/suburb in Indian urban context
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
    const displayName = json.display_name || `${name}, ${region}`;

    const locationData = {
      name,
      region,
      displayName,
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
    clearTimeout(timeoutId);
    console.warn(`Reverse geocode network error for (${lat}, ${lon}):`, err);
    return NextResponse.json(getFallbackLocation(lat, lon));
  }
}

function getFallbackLocation(lat: number, lon: number) {
  return {
    name: 'Current Location',
    region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
    displayName: `Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    latitude: lat,
    longitude: lon,
  };
}
