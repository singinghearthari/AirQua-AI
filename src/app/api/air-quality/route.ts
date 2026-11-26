import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getErrorMessage, jsonError, jsonOk } from '@/lib/api/http';
import { getAirQualityData } from '@/lib/aqi/adapter';

export const runtime = 'nodejs';

const CoordinateString = (min: number, max: number, label: string) =>
  z.string({ required_error: `${label} is required` }).transform((val, ctx) => {
    const num = Number(val);
    if (isNaN(num) || num < min || num > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be a valid number between ${min} and ${max}`,
      });
      return z.NEVER;
    }
    return num;
  });

const QuerySchema = z.object({
  lat: CoordinateString(-90, 90, 'Latitude'),
  lon: CoordinateString(-180, 180, 'Longitude'),
  name: z.string().optional().default('Selected Location'),
  region: z.string().optional(),
  countryCode: z.string().optional().default('IN'),
  scale: z.enum(['IN_CPCB', 'US_EPA']).optional().default('IN_CPCB'),
  persona: z
    .enum(['COMMUTER', 'FAMILY_KIDS', 'SENIOR', 'STUDENT_ATHLETE'])
    .optional()
    .default('FAMILY_KIDS'),
  simulateStale: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

/**
 * Fetches live Open-Meteo air quality + weather dispersion telemetry and returns
 * deterministic CPCB/US AQI scores, 24h safe windows, and persona daily guidance.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parseResult = QuerySchema.safeParse({
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
    name: searchParams.get('name') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    countryCode: searchParams.get('countryCode') ?? undefined,
    scale: searchParams.get('scale') ?? undefined,
    persona: searchParams.get('persona') ?? undefined,
    simulateStale: searchParams.get('simulateStale') ?? undefined,
  });

  if (!parseResult.success) {
    return jsonError('Invalid air quality query parameters', 400, {
      details: parseResult.error.format(),
    });
  }

  const { lat, lon, name, region, countryCode, scale, persona, simulateStale } =
    parseResult.data;

  try {
    const result = await getAirQualityData({
      latitude: lat,
      longitude: lon,
      locationName: name,
      region,
      countryCode,
      scale,
      persona,
      simulateStale,
    });

    return jsonOk(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/air-quality:', error);
    return jsonError('Unable to retrieve live air quality telemetry from Open-Meteo', 502, {
      extra: { message: getErrorMessage(error, 'Unknown network failure') },
    });
  }
}
