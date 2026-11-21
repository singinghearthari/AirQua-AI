import { describe, it, expect } from 'vitest';
import {
  calculateCpcbSubIndex,
  calculateOverallCpcbAqi,
  getCpcbCategory,
  CPCB_BREAKPOINTS,
} from '@/lib/aqi/cpcbCalculator';

describe('cpcbCalculator', () => {
  describe('calculateCpcbSubIndex', () => {
    it('calculates PM2.5 sub-index correctly across all CPCB bands', () => {
      // Good band: 0–30 -> 0–50. Midpoint 15 -> 25
      expect(calculateCpcbSubIndex('PM2_5', 15)).toBe(25);

      // Satisfactory band: 31–60 -> 51–100. At 60 -> 100
      expect(calculateCpcbSubIndex('PM2_5', 60)).toBe(100);

      // Moderate band: 61–90 -> 101–200. At 75 -> 149 or 150
      const modSub = calculateCpcbSubIndex('PM2_5', 75);
      expect(modSub).toBeGreaterThanOrEqual(148);
      expect(modSub).toBeLessThanOrEqual(152);

      // Poor band: 91–120 -> 201–300. At 120 -> 300
      expect(calculateCpcbSubIndex('PM2_5', 120)).toBe(300);

      // Very Poor band: 121–250 -> 301–400. At 250 -> 400
      expect(calculateCpcbSubIndex('PM2_5', 250)).toBe(400);

      // Severe band: 251–500 -> 401–500. At 375 -> ~450
      const severeSub = calculateCpcbSubIndex('PM2_5', 375);
      expect(severeSub).toBeGreaterThanOrEqual(448);
      expect(severeSub).toBeLessThanOrEqual(452);

      // Off-chart extreme (> 500) capped at 500
      expect(calculateCpcbSubIndex('PM2_5', 750)).toBe(500);
    });

    it('calculates PM10 sub-index correctly', () => {
      expect(calculateCpcbSubIndex('PM10', 25)).toBe(25);
      expect(calculateCpcbSubIndex('PM10', 100)).toBe(100);
      expect(calculateCpcbSubIndex('PM10', 250)).toBe(200);
      expect(calculateCpcbSubIndex('PM10', 350)).toBe(300);
      expect(calculateCpcbSubIndex('PM10', 430)).toBe(400);
    });

    it('calculates CO sub-index (in mg/m3) correctly', () => {
      expect(calculateCpcbSubIndex('CO', 0.5)).toBe(25);
      expect(calculateCpcbSubIndex('CO', 1.0)).toBe(50);
      expect(calculateCpcbSubIndex('CO', 2.0)).toBe(100);
      expect(calculateCpcbSubIndex('CO', 10.0)).toBe(200);
    });

    it('handles null, negative, and invalid values gracefully', () => {
      expect(calculateCpcbSubIndex('PM2_5', null)).toBeNull();
      expect(calculateCpcbSubIndex('PM2_5', -10)).toBeNull();
      expect(calculateCpcbSubIndex('PM2_5', NaN)).toBeNull();
    });
  });

  describe('getCpcbCategory', () => {
    it('returns official CPCB category names', () => {
      expect(getCpcbCategory(25)).toBe('Good');
      expect(getCpcbCategory(50)).toBe('Good');
      expect(getCpcbCategory(51)).toBe('Satisfactory');
      expect(getCpcbCategory(100)).toBe('Satisfactory');
      expect(getCpcbCategory(101)).toBe('Moderate');
      expect(getCpcbCategory(200)).toBe('Moderate');
      expect(getCpcbCategory(201)).toBe('Poor');
      expect(getCpcbCategory(300)).toBe('Poor');
      expect(getCpcbCategory(301)).toBe('Very Poor');
      expect(getCpcbCategory(400)).toBe('Very Poor');
      expect(getCpcbCategory(401)).toBe('Severe');
      expect(getCpcbCategory(500)).toBe('Severe');
      expect(getCpcbCategory(null)).toBe('Unknown');
    });
  });

  describe('calculateOverallCpcbAqi', () => {
    it('takes the maximum sub-index and identifies the dominant pollutant', () => {
      const pollutants = [
        { code: 'PM2_5' as const, value: 185 }, // Very Poor (~350)
        { code: 'PM10' as const, value: 80 },   // Satisfactory (80)
        { code: 'NO2' as const, value: 30 },    // Good (38)
        { code: 'SO2' as const, value: 20 },    // Good (25)
        { code: 'CO' as const, value: 1.2 },    // Satisfactory (62)
        { code: 'O3' as const, value: 45 },     // Good (45)
      ];

      const result = calculateOverallCpcbAqi(pollutants);

      expect(result.dominantPollutant).toBe('PM2_5');
      expect(result.overallAqi).toBeGreaterThanOrEqual(345);
      expect(result.overallAqi).toBeLessThanOrEqual(355);
      expect(result.category).toBe('Very Poor');
      expect(result.subIndices.PM2_5).toBe(result.overallAqi);
    });

    it('returns null overall AQI when all pollutant values are null', () => {
      const pollutants = [
        { code: 'PM2_5' as const, value: null },
        { code: 'PM10' as const, value: null },
      ];

      const result = calculateOverallCpcbAqi(pollutants);
      expect(result.overallAqi).toBeNull();
      expect(result.category).toBe('Unknown');
      expect(result.dominantPollutant).toBeNull();
    });
  });
});
