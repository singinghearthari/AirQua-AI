import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAirQualityData } from '@/lib/aqi/adapter';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  lat: z
    .string({ required_error: 'Latitude is required' })
    .transform((val, ctx) => {
      const num = Number(val);
      if (isNaN(num) || num < -90 || num > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Latitude must be a valid number between -90 and 90',
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
          message: 'Longitude must be a valid number between -180 and 180',
        });
        return z.NEVER;
      }
      return num;
    }),
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawParams = {
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
    name: searchParams.get('name') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    countryCode: searchParams.get('countryCode') ?? undefined,
    scale: searchParams.get('scale') ?? undefined,
    persona: searchParams.get('persona') ?? undefined,
    simulateStale: searchParams.get('simulateStale') ?? undefined,
  };

  const parseResult = QuerySchema.safeParse(rawParams);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid air quality query parameters',
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
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

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error in /api/air-quality:', error);
    return NextResponse.json(
      {
        error: 'Unable to retrieve live air quality telemetry from Open-Meteo',
        message: error instanceof Error ? error.message : 'Unknown network failure',
      },
      { status: 502 }
    );
  }
}
