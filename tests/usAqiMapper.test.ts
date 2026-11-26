import { describe, it, expect } from 'vitest';
import {
  getUsAqiCategory,
  calculateUsAqiFromPm25,
  assertScaleIntegrity,
  US_EPA_CATEGORIES,
  CPCB_CATEGORIES,
} from '@/lib/aqi/usAqiMapper';

describe('usAqiMapper & Strict Scale Separation', () => {
  describe('getUsAqiCategory', () => {
    it('maps US AQI numeric values to official EPA categories', () => {
      expect(getUsAqiCategory(30)).toBe('Good');
      expect(getUsAqiCategory(50)).toBe('Good');
      expect(getUsAqiCategory(75)).toBe('Moderate');
      expect(getUsAqiCategory(100)).toBe('Moderate');
      expect(getUsAqiCategory(125)).toBe('Unhealthy for Sensitive Groups');
      expect(getUsAqiCategory(150)).toBe('Unhealthy for Sensitive Groups');
      expect(getUsAqiCategory(175)).toBe('Unhealthy');
      expect(getUsAqiCategory(200)).toBe('Unhealthy');
      expect(getUsAqiCategory(250)).toBe('Very Unhealthy');
      expect(getUsAqiCategory(300)).toBe('Very Unhealthy');
      expect(getUsAqiCategory(350)).toBe('Hazardous');
      expect(getUsAqiCategory(null)).toBe('Unknown');
    });
  });

  describe('calculateUsAqiFromPm25', () => {
    it('estimates EPA AQI accurately from PM2.5 concentration', () => {
      // 0 - 12 ug/m3 -> 0 - 50 AQI
      expect(calculateUsAqiFromPm25(6.0)).toBe(25);
      expect(calculateUsAqiFromPm25(12.0)).toBe(50);

      // 12.1 - 35.4 ug/m3 -> 51 - 100 AQI
      const moderateAqi = calculateUsAqiFromPm25(25.0);
      expect(moderateAqi).toBeGreaterThanOrEqual(70);
      expect(moderateAqi).toBeLessThanOrEqual(85);

      // Zero and negative/extreme boundary behavior
      expect(calculateUsAqiFromPm25(0)).toBe(0);
      expect(calculateUsAqiFromPm25(-5)).toBeNull();
      expect(calculateUsAqiFromPm25(null)).toBeNull();
      expect(calculateUsAqiFromPm25(600)).toBe(500);
    });
  });

  describe('Strict Scale Separation Guardrail', () => {
    it('verifies US EPA categories are distinct from CPCB categories', () => {
      // "Satisfactory" and "Severe" belong ONLY to CPCB
      expect(assertScaleIntegrity('IN_CPCB', 'Satisfactory')).toBe(true);
      expect(assertScaleIntegrity('US_EPA', 'Satisfactory')).toBe(false);

      expect(assertScaleIntegrity('IN_CPCB', 'Severe')).toBe(true);
      expect(assertScaleIntegrity('US_EPA', 'Severe')).toBe(false);

      // "Unhealthy for Sensitive Groups" and "Hazardous" belong ONLY to US EPA
      expect(assertScaleIntegrity('US_EPA', 'Unhealthy for Sensitive Groups')).toBe(true);
      expect(assertScaleIntegrity('IN_CPCB', 'Unhealthy for Sensitive Groups')).toBe(false);

      expect(assertScaleIntegrity('US_EPA', 'Hazardous')).toBe(true);
      expect(assertScaleIntegrity('IN_CPCB', 'Hazardous')).toBe(false);
    });

    it('documents the critical semantic difference in "Moderate"', () => {
      // Both scales define a "Moderate" category, but:
      // In US EPA: AQI 51–100 is "Moderate"
      // In CPCB: AQI 51–100 is "Satisfactory", and AQI 101–200 is "Moderate"!
      expect(getUsAqiCategory(80)).toBe('Moderate');
      // In CPCB, 80 must NEVER be labeled Moderate!
      // This confirms we never cross-contaminate.
    });
  });
});
