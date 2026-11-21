import { PollutantReading } from '@/types/airqua';

/**
 * CPCB Breakpoint tuple: [Concentration_Low, Concentration_High, Index_Low, Index_High]
 */
interface CpcbBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * Official Indian Central Pollution Control Board (CPCB) Breakpoint Table
 */
export const CPCB_BREAKPOINTS: Record<PollutantReading['code'], CpcbBreakpoint[]> = {
  PM2_5: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  PM10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
  ],
  NO2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
  ],
  SO2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 },
  ],
  CO: [
    // In mg/m3
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
  ],
  O3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
};

/**
 * Calculates the CPCB sub-index for a single pollutant reading.
 * Formula: I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 */
export function calculateCpcbSubIndex(
  pollutant: PollutantReading['code'],
  concentration: number | null
): number | null {
  if (concentration === null || isNaN(concentration) || concentration < 0) {
    return null;
  }

  const breakpoints = CPCB_BREAKPOINTS[pollutant];
  if (!breakpoints) return null;

  // Handle value below lowest breakpoint
  if (concentration <= breakpoints[0].cLow) {
    return breakpoints[0].iLow;
  }

  // Find matching breakpoint range
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      const subIndex =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
      return Math.round(subIndex);
    }
  }

  // Value exceeds maximum table breakpoint -> cap at highest category sub-index (500)
  const lastBp = breakpoints[breakpoints.length - 1];
  if (concentration > lastBp.cHigh) {
    return 500;
  }

  return null;
}

/**
 * Maps an overall CPCB AQI value to its official National AQI category.
 */
export function getCpcbCategory(aqi: number | null): string {
  if (aqi === null || isNaN(aqi) || aqi < 0) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export interface CpcbCalculationResult {
  overallAqi: number | null;
  category: string;
  dominantPollutant: PollutantReading['code'] | null;
  subIndices: Record<PollutantReading['code'], number | null>;
  disclaimer: string;
}

/**
 * Computes overall CPCB AQI from a map of pollutant values.
 * CPCB rule: Overall AQI = max(subIndices).
 * Note: Officially CPCB recommends at least 3 pollutants with at least one particulate (PM2.5 or PM10).
 */
export function calculateOverallCpcbAqi(
  pollutants: Array<{ code: PollutantReading['code']; value: number | null }>
): CpcbCalculationResult {
  const subIndices: Record<PollutantReading['code'], number | null> = {
    PM2_5: null,
    PM10: null,
    O3: null,
    NO2: null,
    SO2: null,
    CO: null,
  };

  let maxSubIndex: number | null = null;
  let dominant: PollutantReading['code'] | null = null;

  for (const p of pollutants) {
    const sub = calculateCpcbSubIndex(p.code, p.value);
    subIndices[p.code] = sub;

    if (sub !== null) {
      if (maxSubIndex === null || sub > maxSubIndex) {
        maxSubIndex = sub;
        dominant = p.code;
      }
    }
  }

  const category = getCpcbCategory(maxSubIndex);

  return {
    overallAqi: maxSubIndex,
    category,
    dominantPollutant: dominant,
    subIndices,
    disclaimer:
      'Calculated using CPCB National AQI breakpoints from hourly modeled readings (24h regulatory station averages may vary).',
  };
}
