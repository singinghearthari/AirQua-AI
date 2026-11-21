import { describe, it, expect } from 'vitest';
import { evaluateFreshness } from '@/lib/aqi/openMeteoProvider';

describe('Data Freshness Evaluator', () => {
  it('returns FRESH for observations under 60 minutes old', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = evaluateFreshness(tenMinutesAgo);

    expect(result.freshness).toBe('FRESH');
    expect(result.effectiveObservedAt).toBe(tenMinutesAgo);
  });

  it('returns STALE for observations between 60 and 180 minutes old', () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const result = evaluateFreshness(twoHoursAgo);

    expect(result.freshness).toBe('STALE');
    expect(result.effectiveObservedAt).toBe(twoHoursAgo);
  });

  it('returns UNAVAILABLE for observations older than 180 minutes', () => {
    const fourHoursAgo = new Date(Date.now() - 240 * 60 * 1000).toISOString();
    const result = evaluateFreshness(fourHoursAgo);

    expect(result.freshness).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE for null or invalid timestamp', () => {
    expect(evaluateFreshness(null).freshness).toBe('UNAVAILABLE');
    expect(evaluateFreshness('invalid-timestamp').freshness).toBe('UNAVAILABLE');
  });

  it('forces STALE state when simulateStale demo mode is enabled', () => {
    const justNow = new Date().toISOString();
    const result = evaluateFreshness(justNow, true);

    expect(result.freshness).toBe('STALE');
    // Effective observed timestamp should be ~120m ago
    const effectiveTime = new Date(result.effectiveObservedAt!).getTime();
    const diffMin = (Date.now() - effectiveTime) / (60 * 1000);
    expect(diffMin).toBeGreaterThanOrEqual(118);
    expect(diffMin).toBeLessThanOrEqual(122);
  });
});
