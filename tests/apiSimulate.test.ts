import { describe, it, expect } from 'vitest';
import { POST as simulateHandler } from '@/app/api/simulate/route';
import { NextRequest } from 'next/server';

describe('/api/simulate', () => {
  it('rejects missing or malformed request payload with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/simulate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await simulateHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid simulation parameters');
  });

  it('rejects invalid persona with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        activeToggles: ['SHIFT_OUTDOOR_TO_SAFE_WINDOW'],
        persona: 'INVALID_PERSONA',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await simulateHandler(req);
    expect(res.status).toBe(400);
  });

  it('calculates deterministic exposure shift and strictly 0.0 emissions for outdoor shift toggle', async () => {
    const req = new NextRequest('http://localhost:3000/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        activeToggles: ['SHIFT_OUTDOOR_TO_SAFE_WINDOW'],
        persona: 'FAMILY_KIDS',
        currentPeakPm25: 220,
        safeWindowPm25: 60,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await simulateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('result');
    const { result } = json;

    // Personal exposure is lower
    expect(result.personalExposure.direction).toBe('LIKELY_LOWER');
    expect(result.personalExposure.summary).toMatch(/safe window/i);
    expect(result.personalExposure.limitation).toMatch(/0\.0 kg CO2e/i);

    // Emissions savings MUST strictly be 0.0 kg CO2e
    expect(result.emissionsImpact.co2eMinKg).toBe(0);
    expect(result.emissionsImpact.co2eMaxKg).toBe(0);
    expect(result.emissionsImpact.unit).toBe('kg CO2e/day');
    expect(result.dataKind).toBe('ESTIMATE');
  });

  it('calculates deterministic min-max emissions savings for transit modal shift with vehicle segments', async () => {
    const distanceKm = 20;
    const req = new NextRequest('http://localhost:3000/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'SMALL_HATCHBACK',
        commuteDistanceKm: distanceKm,
        timeHorizon: 'DAY',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await simulateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const { result } = json;

    // Hatchback (0.12–0.14) vs Transit (0.015–0.04)
    // Min: (0.12 - 0.04) * 20 = 1.60 kg
    // Max: (0.14 - 0.015) * 20 = 2.50 kg
    expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(1.6, 2);
    expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(2.5, 2);
    expect(result.emissionsImpact.formula).toContain('Small Hatchback Petrol');
    expect(result.emissionsImpact.assumptions.length).toBeGreaterThan(0);
  });

  it('supports time-horizon scaling across workweek (5x)', async () => {
    const req = new NextRequest('http://localhost:3000/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        activeToggles: ['CAR_TO_TRANSIT'],
        persona: 'COMMUTER',
        vehicleSegment: 'MIDSIZE_SEDAN',
        commuteDistanceKm: 20,
        timeHorizon: 'WORKWEEK',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await simulateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const { result } = json;

    // Sedan daily: [2.20, 3.30] -> 5 days: [11.00, 16.50]
    expect(result.emissionsImpact.horizonMultiplier).toBe(5);
    expect(result.emissionsImpact.co2eMinKg).toBeCloseTo(11.0, 1);
    expect(result.emissionsImpact.co2eMaxKg).toBeCloseTo(16.5, 1);
    expect(result.emissionsImpact.unit).toContain('5 days');
  });
});
