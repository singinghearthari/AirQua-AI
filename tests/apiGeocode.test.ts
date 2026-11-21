import { describe, it, expect } from 'vitest';
import { GET as geocodeHandler } from '@/app/api/geocode/route';
import { NextRequest } from 'next/server';

describe('/api/geocode', () => {
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

  it('returns Indian cities for valid search query', async () => {
    const req = new NextRequest('http://localhost:3000/api/geocode?q=Delhi');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);

    const first = json.results[0];
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('latitude');
    expect(first).toHaveProperty('longitude');
    expect(first.name).toMatch(/Delhi/i);
  });

  it('falls back to local Indian catalog for offline/fallback queries', async () => {
    const req = new NextRequest('http://localhost:3000/api/geocode?q=Chennai');
    const res = await geocodeHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.some((c: any) => c.name.toLowerCase().includes('chennai'))).toBe(true);
  });
});
