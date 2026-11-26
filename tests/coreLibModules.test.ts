import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAirQualityData } from '@/lib/aqi/adapter';
import { clearOpenMeteoCache } from '@/lib/aqi/openMeteoProvider';
import { generatePersonaDayPeriodPlan } from '@/lib/aqi/dailyPeriodPlanner';
import { getReadableAuthErrorMessage } from '@/lib/firebase/authErrors';
import {
  getChatConsultantSystemPrompt,
  getRoomScanSystemPrompt,
} from '@/lib/gemini/prompts';
import { loadStoredActions, loadStoredPreferences, persistActions, persistPreferences } from '@/lib/storage/airquaStorage';
import {
  buildQuickPrompts,
  buildWelcomeMessage,
  formatBestWindowLabel,
  formatIsoClockTime,
  getNextMessageId,
  loadAutoReadPreference,
  loadCrossScreenContext,
  loadStoredChatMessages,
} from '@/lib/storage/chatStorage';

describe('Core AQI, Auth, Prompts & Storage Modules', () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    clearOpenMeteoCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    }
    if (originalLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, 'localStorage');
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });

  it('adapts Open-Meteo telemetry for IN_CPCB and US_EPA scales with graceful weather failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const now = new Date().toISOString().slice(0, 16);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('air-quality-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({
            timezone: 'Asia/Kolkata',
            utc_offset_seconds: 19800,
            current: {
              time: now,
              pm2_5: 90,
              pm10: 140,
              nitrogen_dioxide: 30,
              sulphur_dioxide: 12,
              carbon_monoxide: 1000,
              ozone: 40,
              us_aqi: 169,
            },
            hourly: {
              time: [now],
              pm2_5: [90],
              pm10: [140],
              us_aqi: [169],
            },
          }),
          { status: 200 }
        );
      }
      return new Response('Weather down', { status: 503 });
    });

    const usResult = await getAirQualityData({
      latitude: 13.08,
      longitude: 80.27,
      locationName: 'Chennai',
      scale: 'US_EPA',
      persona: 'SENIOR',
      simulateStale: true,
    });

    expect(usResult.snapshot.scale).toBe('US_EPA');
    expect(usResult.snapshot.aqiValue).toBe(169);
    expect(usResult.snapshot.aqiCategory).toBe('Unhealthy');
    expect(usResult.snapshot.freshness).toBe('STALE');
    expect(usResult.snapshot.weather).toBeNull();
    expect(usResult.snapshot.pollutants.find((p) => p.code === 'CO')?.value).toBe(1);
  });

  it('generates UNKNOWN risk guidance cleanly when dailyPeriodPlanner receives null or NaN PM2.5', () => {
    const planNull = generatePersonaDayPeriodPlan('MORNING', '06:00 - 12:00', null, 'COMMUTER');
    const planNaN = generatePersonaDayPeriodPlan('EVENING', '17:00 - 23:00', NaN, 'SENIOR');

    expect(planNull.riskLevel).toBe('UNKNOWN');
    expect(planNull.avgPm25).toBeNull();
    expect(planNaN.riskLevel).toBe('UNKNOWN');
  });

  it('maps Firebase Authentication errors to readable messages', () => {
    expect(getReadableAuthErrorMessage({ code: 'auth/wrong-password' })).toMatch(/Incorrect email/);
    expect(getReadableAuthErrorMessage({ code: 'auth/user-not-found' })).toMatch(/No account found/);
    expect(getReadableAuthErrorMessage({ code: 'auth/email-already-in-use' })).toMatch(/already exists/);
    expect(getReadableAuthErrorMessage({ code: 'auth/weak-password' })).toMatch(/6 characters/);
    expect(getReadableAuthErrorMessage({ code: 'auth/invalid-email' })).toMatch(/valid email/);
    expect(getReadableAuthErrorMessage({ code: 'auth/popup-closed-by-user' })).toMatch(/cancelled/);
    expect(getReadableAuthErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/Network/);
    expect(getReadableAuthErrorMessage(new Error('Custom failure'))).toBe('Custom failure');
    expect(getReadableAuthErrorMessage(null)).toBe('Authentication failed. Please try again.');
  });

  it('generates bilingual prompts preserving scientific and sensor guardrails', () => {
    const roomTa = getRoomScanSystemPrompt('FAMILY_KIDS', 'ta');
    expect(roomTa).toContain('Tamil');
    expect(roomTa).toContain('FAMILY_KIDS');
    expect(roomTa).toContain('sensorBoundaryNotice');

    const chatEn = getChatConsultantSystemPrompt(
      'STUDENT_ATHLETE',
      'en',
      null,
      null,
      'Kitchen smoke hazard',
      ['CAR_TO_TRANSIT']
    );
    expect(chatEn).toContain('STUDENT_ATHLETE');
    expect(chatEn).toContain('Kitchen smoke hazard');
    expect(chatEn).toContain('CAR_TO_TRANSIT');
    expect(chatEn).toContain('NEVER diagnose medical conditions');
  });

  it('handles storage helpers in SSR and mocked browser storage with corrupt JSON recovery', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // SSR safe behavior
    expect(loadStoredPreferences().persona).toBe('FAMILY_KIDS');
    expect(loadStoredActions()).toEqual([]);
    expect(loadStoredChatMessages()).toBeNull();
    expect(loadAutoReadPreference()).toBe(false);
    expect(loadCrossScreenContext()).toEqual({ roomScan: null, simulatorSwaps: null });

    const store = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };

    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, configurable: true });

    persistPreferences({
      city: {
        name: 'Chennai',
        region: 'Tamil Nadu',
        countryCode: 'IN',
        latitude: 13.08,
        longitude: 80.27,
      },
      persona: 'SENIOR',
      scale: 'US_EPA',
      language: 'ta',
    });
    expect(loadStoredPreferences().city.name).toBe('Chennai');

    persistActions([
      {
        id: 'a1',
        headline: 'Exhaust on',
        action: 'Ventilate kitchen',
        period: 'TODAY',
        savedAt: '2026-11-26T00:00:00.000Z',
      },
    ]);
    expect(loadStoredActions()).toHaveLength(1);

    // Corrupt JSON recovers gracefully instead of throwing
    store.set('airqua_user_prefs_v2', '{corrupt');
    expect(loadStoredPreferences().language).toBe('en');

    expect(getNextMessageId('user')).toContain('user-');
    expect(buildWelcomeMessage('Delhi', 'ta', 'SENIOR').text).toContain('Delhi');
    expect(buildQuickPrompts(undefined, 'en')).toContain('தமிழில் விளக்குங்கள்');
    expect(formatBestWindowLabel(null)).toBe('12:00–15:00');
    expect(formatIsoClockTime('2026-11-26T14:00', false)).toBe('14:00');
    expect(formatIsoClockTime('2026-11-26T14:00', true)).toBe('02:00 PM');
    expect(formatIsoClockTime('2026-11-26T00:00', true)).toBe('12:00 AM');
    expect(formatIsoClockTime('2026-11-26T07:30:00.000Z', false)).toBe('13:00');
  });
});
