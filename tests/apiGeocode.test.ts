import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as geocodeHandler } from '@/app/api/geocode/route';
import { NextRequest } from 'next/server';

interface GeocodeCityResult {
  name: string;
  latitude: number;
  longitude: number;
}

describe('/api/geocode', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects queries shorter than 2 characters with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/geocode?q=d');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid search query');
  });

  it('rejects missing query parameter with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/geocode');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(400);
  });

  it('returns Indian cities for valid search query using mocked upstream response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1273294,
              name: 'New Delhi',
              latitude: 28.6139,
              longitude: 77.209,
              country: 'India',
              country_code: 'IN',
              admin1: 'Delhi',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new NextRequest('http://localhost:3000/api/geocode?q=Delhi');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: GeocodeCityResult[] };
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);

    const first = json.results[0];
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('latitude');
    expect(first).toHaveProperty('longitude');
    expect(first.name).toMatch(/Delhi/i);
  });

  it('falls back to local Indian catalog when upstream geocoder fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Upstream timeout'));

    const req = new NextRequest('http://localhost:3000/api/geocode?q=Chennai');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: GeocodeCityResult[] };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.some((c) => c.name.toLowerCase().includes('chennai'))).toBe(true);
  });
});
