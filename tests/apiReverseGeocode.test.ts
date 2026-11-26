import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as reverseGeocodeHandler } from '@/app/api/reverse-geocode/route';
import { NextRequest } from 'next/server';

describe('/api/reverse-geocode', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing latitude or longitude with status 400', async () => {
    const reqMissingBoth = new NextRequest('http://localhost:3000/api/reverse-geocode');
    const res1 = await reverseGeocodeHandler(reqMissingBoth);
    expect(res1.status).toBe(400);

    const reqMissingLon = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=28.6139');
    const res2 = await reverseGeocodeHandler(reqMissingLon);
    expect(res2.status).toBe(400);
  });

  it('rejects out-of-range coordinates with status 400', async () => {
    const reqInvalidLat = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=195&lon=77.2');
    const res = await reverseGeocodeHandler(reqInvalidLat);
    expect(res.status).toBe(400);
  });

  it('returns valid location object for Delhi coordinates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          address: {
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=28.6139&lon=77.2090');
    const res = await reverseGeocodeHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('name', 'New Delhi');
    expect(json).toHaveProperty('region', 'Delhi');
    expect(json).toHaveProperty('displayName');
    expect(json).toHaveProperty('latitude', 28.6139);
    expect(json).toHaveProperty('longitude', 77.209);
  });

  it('returns fallback location structure gracefully on upstream error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Nominatim unavailable'));

    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=0.0&lon=0.0');
    const res = await reverseGeocodeHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('name');
    expect(json.latitude).toBe(0);
    expect(json.longitude).toBe(0);
  });
});
