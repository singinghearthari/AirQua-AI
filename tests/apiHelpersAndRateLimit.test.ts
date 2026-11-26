import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  enforceRateLimit,
  fetchWithTimeout,
  getErrorMessage,
  jsonError,
  parseJsonBody,
} from '@/lib/api/http';
import { pruneExpiredMapEntries, setBoundedMapEntry } from '@/lib/security/boundedMap';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { POST as simulateHandler } from '@/app/api/simulate/route';
import { GET as actionsHandler } from '@/app/api/actions/route';

describe('API HTTP Helpers, Bounded Maps & Rate Limits', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('getErrorMessage & jsonError', () => {
    it('safely extracts messages from Error, plain objects, strings, and unknown values', () => {
      expect(getErrorMessage(new Error('boom'))).toBe('boom');
      expect(getErrorMessage({ message: 'structured issue' })).toBe('structured issue');
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(null, 'fallback msg')).toBe('fallback msg');
      expect(getErrorMessage({}, 'fallback msg')).toBe('fallback msg');
    });

    it('formats standardized JSON error responses with optional code, details, and headers', async () => {
      const res = jsonError('Bad payload', 422, {
        code: 'INVALID_BODY',
        details: { field: 'message' },
        extra: { retryable: false },
        headers: { 'X-Custom': 'yes' },
      });

      expect(res.status).toBe(422);
      expect(res.headers.get('X-Custom')).toBe('yes');
      expect(await res.json()).toEqual({
        error: 'Bad payload',
        code: 'INVALID_BODY',
        details: { field: 'message' },
        retryable: false,
      });
    });
  });

  describe('parseJsonBody & fetchWithTimeout', () => {
    const schema = z.object({ count: z.number().int().positive() });

    it('returns parsed data for valid payloads and 400 responses for invalid JSON/schema', async () => {
      const validReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ count: 3 }),
      });
      const ok = await parseJsonBody(validReq, schema);
      expect('data' in ok && ok.data.count).toBe(3);

      const badSchemaReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ count: -1 }),
      });
      const schemaErr = await parseJsonBody(badSchemaReq, schema, 'Count error');
      expect('errorResponse' in schemaErr && schemaErr.errorResponse.status).toBe(400);

      const badJsonReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: '{oops',
      });
      const jsonErr = await parseJsonBody(badJsonReq, schema);
      expect('errorResponse' in jsonErr && jsonErr.errorResponse.status).toBe(400);
    });

    it('aborts hung upstream requests via AbortController timeout', async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('Aborted by timeout')));
        });
      });

      const pending = fetchWithTimeout('https://example.com/slow', { timeoutMs: 25 });
      const rejection = expect(pending).rejects.toThrow('Aborted by timeout');
      await vi.advanceTimersByTimeAsync(30);
      await rejection;
    });
  });

  describe('Bounded Map Eviction & Rate Limiter', () => {
    it('evicts oldest keys in insertion order while refreshing updated keys', () => {
      const cache = new Map<string, number>();
      setBoundedMapEntry(cache, 'a', 1, 2);
      setBoundedMapEntry(cache, 'b', 2, 2);
      // Touch 'a' so 'b' becomes oldest
      setBoundedMapEntry(cache, 'a', 10, 2);
      setBoundedMapEntry(cache, 'c', 3, 2);

      expect(cache.size).toBe(2);
      expect(cache.has('b')).toBe(false);
      expect(cache.get('a')).toBe(10);
      expect(cache.get('c')).toBe(3);
    });

    it('prunes expired records cleanly via predicate', () => {
      const map = new Map<string, { exp: number }>([
        ['stale', { exp: 100 }],
        ['fresh', { exp: 9999 }],
      ]);
      pruneExpiredMapEntries(map, (v) => v.exp < 500);
      expect(map.has('stale')).toBe(false);
      expect(map.has('fresh')).toBe(true);
    });

    it('enforces window reset and 429 Retry-After headers', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-26T10:00:00Z'));
      const ip = '198.51.100.77';

      const req1 = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(enforceRateLimit(req1, 2, 1000)).toBeNull();
      expect(enforceRateLimit(req1, 2, 1000)).toBeNull();

      const blocked = enforceRateLimit(req1, 2, 1000, 'Slow down');
      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get('Retry-After')).toBe('1');

      vi.advanceTimersByTime(1100);
      expect(checkRateLimit(`reset-${ip}`, 1, 500).allowed).toBe(true);
      expect(enforceRateLimit(req1, 2, 1000)).toBeNull();
    });

    it('applies rate limiting on /api/simulate and /api/actions without impacting normal requests', async () => {
      const ipSim = '198.51.100.88';
      const simReq = new NextRequest('http://localhost:3000/api/simulate', {
        method: 'POST',
        body: JSON.stringify({ activeToggles: [], persona: 'SENIOR' }),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipSim },
      });
      const simRes = await simulateHandler(simReq);
      expect(simRes.status).toBe(200);

      const actReq = new NextRequest('http://localhost:3000/api/actions', {
        headers: { 'x-forwarded-for': ipSim },
      });
      const actRes = await actionsHandler(actReq);
      expect(actRes.status).toBe(200);
    });
  });
});
