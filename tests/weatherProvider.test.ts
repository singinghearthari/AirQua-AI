import { describe, it, expect } from 'vitest';
import {
  computeDispersionStatus,
  getCompassDirection,
} from '@/lib/aqi/weatherProvider';

describe('Weather & Dispersion Engine', () => {
  describe('computeDispersionStatus', () => {
    it('classifies wind speed < 6 km/h as STAGNANT with trapped ground-level pollutants note', () => {
      const result0 = computeDispersionStatus(0);
      expect(result0.status).toBe('STAGNANT');
      expect(result0.note).toContain('Low wind traps pollutants');

      const result4 = computeDispersionStatus(4.2);
      expect(result4.status).toBe('STAGNANT');

      const result5_9 = computeDispersionStatus(5.9);
      expect(result5_9.status).toBe('STAGNANT');
    });

    it('classifies wind speed between 6 and 15 km/h as MODERATE mixing', () => {
      const result6 = computeDispersionStatus(6.0);
      expect(result6.status).toBe('MODERATE');
      expect(result6.note).toContain('Light breeze; gradual pollutant mixing');

      const result10 = computeDispersionStatus(10.5);
      expect(result10.status).toBe('MODERATE');

      const result15 = computeDispersionStatus(15.0);
      expect(result15.status).toBe('MODERATE');
    });

    it('classifies wind speed > 15 km/h as DISPERSING smog', () => {
      const result16 = computeDispersionStatus(16.0);
      expect(result16.status).toBe('DISPERSING');
      expect(result16.note).toContain('Stronger wind helping disperse surface smog');

      const result35 = computeDispersionStatus(35.5);
      expect(result35.status).toBe('DISPERSING');
    });

    it('returns UNKNOWN for missing, invalid, or negative values without throwing', () => {
      expect(computeDispersionStatus(null).status).toBe('UNKNOWN');
      expect(computeDispersionStatus(undefined).status).toBe('UNKNOWN');
      expect(computeDispersionStatus(NaN).status).toBe('UNKNOWN');
      expect(computeDispersionStatus(-5).status).toBe('UNKNOWN');
    });
  });

  describe('getCompassDirection', () => {
    it('converts degrees into 8-point compass notation correctly', () => {
      expect(getCompassDirection(0)).toBe('N');
      expect(getCompassDirection(360)).toBe('N');
      expect(getCompassDirection(45)).toBe('NE');
      expect(getCompassDirection(90)).toBe('E');
      expect(getCompassDirection(135)).toBe('SE');
      expect(getCompassDirection(180)).toBe('S');
      expect(getCompassDirection(225)).toBe('SW');
      expect(getCompassDirection(270)).toBe('W');
      expect(getCompassDirection(315)).toBe('NW');
    });

    it('handles null/NaN gracefully', () => {
      expect(getCompassDirection(null)).toBe('—');
      expect(getCompassDirection(NaN)).toBe('—');
    });
  });
});
