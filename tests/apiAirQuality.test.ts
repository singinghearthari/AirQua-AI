import { describe, it, expect } from 'vitest';
import { GET as airQualityHandler } from '@/app/api/air-quality/route';
import { NextRequest } from 'next/server';

describe('/api/air-quality', () => {
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
    const req = new NextRequest(
      'http://localhost:3000/api/air-quality?lat=28.6139&lon=77.2090&name=Delhi&scale=IN_CPCB&persona=FAMILY_KIDS'
    );
    const res = await airQualityHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('snapshot');
    expect(json).toHaveProperty('safeWindows');

    // Verify snapshot structure
    expect(json.snapshot.scale).toBe('IN_CPCB');
    expect(json.snapshot.location.name).toBe('Delhi');
    expect(json.snapshot.pollutants.length).toBe(6);
    expect(json.snapshot).toHaveProperty('weather');

    // Verify safe windows structure
    expect(json.safeWindows.dailyPeriods.length).toBe(3);
    expect(json.safeWindows.dailyPeriods[0].period).toBe('MORNING');
    expect(json.safeWindows.dailyPeriods[1].period).toBe('AFTERNOON');
    expect(json.safeWindows.dailyPeriods[2].period).toBe('EVENING');
  }, 15000); // 15s timeout for network call

  it('supports simulateStale=true returning STALE freshness', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/air-quality?lat=28.6139&lon=77.2090&simulateStale=true'
    );
    const res = await airQualityHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshot.freshness).toBe('STALE');
  }, 15000);
});
