import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as airQualityHandler } from '@/app/api/air-quality/route';
import { clearOpenMeteoCache } from '@/lib/aqi/openMeteoProvider';
import { NextRequest } from 'next/server';

function createMockTelemetryFetch() {
  const now = new Date();
  const hourlyTime: string[] = [];
  const pm2_5: number[] = [];
  const pm10: number[] = [];
  const no2: number[] = [];
  const so2: number[] = [];
  const co: number[] = [];
  const o3: number[] = [];
  const usAqi: number[] = [];

  for (let i = 0; i < 24; i++) {
    const d = new Date(now);
    d.setHours(i, 0, 0, 0);
    hourlyTime.push(d.toISOString().slice(0, 16));
    pm2_5.push(95 + (i % 6) * 10);
    pm10.push(140 + (i % 6) * 12);
    no2.push(35);
    so2.push(14);
    co.push(1100);
    o3.push(48);
    usAqi.push(172);
  }

  const currentHourStr = new Date(
    Math.floor(now.getTime() / (60 * 60 * 1000)) * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 16);

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({
          timezone: 'Asia/Kolkata',
          utc_offset_seconds: 19800,
          current: {
            time: currentHourStr,
            pm2_5: 135,
            pm10: 195,
            nitrogen_dioxide: 42,
            sulphur_dioxide: 16,
            carbon_monoxide: 1450,
            ozone: 52,
            us_aqi: 192,
          },
          hourly: {
            time: hourlyTime,
            pm2_5,
            pm10,
            nitrogen_dioxide: no2,
            sulphur_dioxide: so2,
            carbon_monoxide: co,
            ozone: o3,
            us_aqi: usAqi,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        current: {
          temperature_2m: 29.4,
          relative_humidity_2m: 58,
          wind_speed_10m: 9.2,
          surface_pressure: 1012,
        },
        hourly: {
          time: hourlyTime,
          wind_speed_10m: new Array(24).fill(8.5),
          boundary_layer_height: new Array(24).fill(520),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}

describe('/api/air-quality', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearOpenMeteoCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests with missing latitude or longitude', async () => {
    const req = new NextRequest('http://localhost:3000/api/air-quality?lat=28.61');
    const res = await airQualityHandler(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid air quality query parameters');
  });

  it('rejects out-of-range coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/air-quality?lat=120&lon=77.20');
    const res = await airQualityHandler(req);

    expect(res.status).toBe(400);
  });

  it('returns valid snapshot and safeWindows for Delhi coordinates', async () => {
    createMockTelemetryFetch();

    const req = new NextRequest(
      'http://localhost:3000/api/air-quality?lat=28.6139&lon=77.2090&name=Delhi&scale=IN_CPCB&persona=FAMILY_KIDS'
    );
    const res = await airQualityHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('snapshot');
    expect(json).toHaveProperty('safeWindows');
    expect(json.snapshot.scale).toBe('IN_CPCB');
    expect(json.snapshot.location.name).toBe('Delhi');
    expect(json.snapshot.pollutants.length).toBe(6);
    expect(json.snapshot).toHaveProperty('weather');

    expect(json.safeWindows.dailyPeriods.length).toBe(3);
    expect(json.safeWindows.dailyPeriods[0].period).toBe('MORNING');
    expect(json.safeWindows.dailyPeriods[1].period).toBe('AFTERNOON');
    expect(json.safeWindows.dailyPeriods[2].period).toBe('EVENING');
  });

  it('supports simulateStale=true returning STALE freshness', async () => {
    createMockTelemetryFetch();

    const req = new NextRequest(
      'http://localhost:3000/api/air-quality?lat=28.6139&lon=77.2090&simulateStale=true'
    );
    const res = await airQualityHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshot.freshness).toBe('STALE');
  });

  it('returns status 502 when upstream Open-Meteo API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Open-Meteo network down'));

    const req = new NextRequest(
      'http://localhost:3000/api/air-quality?lat=19.0760&lon=72.8777&name=Mumbai'
    );
    const res = await airQualityHandler(req);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/Unable to retrieve live air quality telemetry/i);
  });
});
