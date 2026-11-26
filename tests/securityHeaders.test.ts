import { describe, it, expect, afterEach } from 'vitest';
import nextConfig from '../next.config';
import { getGeminiClient } from '@/lib/gemini/client';
import { getGroqClient, isQuotaOrRateLimitError } from '@/lib/ai/groqClient';
import { GEMINI_MODEL } from '@/lib/ai/providerRouter';

describe('Security Headers, Model Versioning & Runtime Isolation', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });

  it('configures strict baseline HTTP security headers in next.config.ts', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const entries = nextConfig.headers ? await nextConfig.headers() : [];
    const globalRule = entries.find((entry) => entry.source === '/(.*)');
    expect(globalRule).toBeDefined();

    const headerMap = new Map(
      (globalRule?.headers || []).map((h) => [h.key, h.value])
    );

    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerMap.get('Permissions-Policy')).toContain('camera=()');
    expect(headerMap.get('Permissions-Policy')).toContain('microphone=(self)');
    expect(headerMap.get('Permissions-Policy')).toContain('geolocation=(self)');
  });

  it('pins the primary Gemini model to gemini-3.5-flash-lite by default', () => {
    expect(GEMINI_MODEL).toBe(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite');
    expect(GEMINI_MODEL).not.toContain('gemini-2.5-flash');
  });

  it('refuses to initialize AI clients when browser window object is defined', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => getGeminiClient()).toThrow(/only be initialized on the server/i);
    expect(() => getGroqClient()).toThrow(/only be initialized on the server/i);
  });

  it('accurately detects quota, rate-limit, overload, and timeout errors for failover', () => {
    expect(isQuotaOrRateLimitError({ status: 429 })).toBe(true);
    expect(isQuotaOrRateLimitError({ status: 503 })).toBe(true);
    expect(isQuotaOrRateLimitError(new Error('RESOURCE_EXHAUSTED on project'))).toBe(true);
    expect(isQuotaOrRateLimitError(new Error('Request timeout exceeded'))).toBe(true);
    expect(isQuotaOrRateLimitError(new Error('Invalid JSON argument'))).toBe(false);
    expect(isQuotaOrRateLimitError(null)).toBe(false);
  });
});
