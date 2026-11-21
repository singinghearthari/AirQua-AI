import { AqiScale } from '@/types/airqua';

/**
 * Official US EPA AQI Categories
 */
export const US_EPA_CATEGORIES = [
  'Good',
  'Moderate',
  'Unhealthy for Sensitive Groups',
  'Unhealthy',
  'Very Unhealthy',
  'Hazardous',
] as const;

export type UsEpaCategory = (typeof US_EPA_CATEGORIES)[number];

/**
 * Official Indian CPCB Categories
 */
export const CPCB_CATEGORIES = [
  'Good',
  'Satisfactory',
  'Moderate',
  'Poor',
  'Very Poor',
  'Severe',
] as const;

export type CpcbCategory = (typeof CPCB_CATEGORIES)[number];

/**
 * Maps a US EPA AQI number to its official EPA category.
 * Strict Scale Rule: NEVER relabel US EPA scores with Indian CPCB categories.
 */
export function getUsAqiCategory(aqi: number | null): UsEpaCategory | 'Unknown' {
  if (aqi === null || isNaN(aqi) || aqi < 0) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * US EPA PM2.5 Breakpoints (concentration in ug/m3 -> AQI)
 */
const US_PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

/**
 * Estimates US EPA AQI from PM2.5 concentration using official EPA breakpoints.
 */
export function calculateUsAqiFromPm25(concentration: number | null): number | null {
  if (concentration === null || isNaN(concentration) || concentration < 0) {
    return null;
  }

  // Truncate concentration to 1 decimal place per EPA guideline
  const c = Math.floor(concentration * 10) / 10;

  for (const bp of US_PM25_BREAKPOINTS) {
    if (c >= bp.cLow && c <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  if (c > 500.4) {
    return 500;
  }

  return null;
}

/**
 * Guardrail asserting that an AQI category belongs to the specified scale.
 * Protects against accidental cross-contamination in UI rendering.
 */
export function assertScaleIntegrity(scale: AqiScale, category: string): boolean {
  if (scale === 'IN_CPCB') {
    return CPCB_CATEGORIES.includes(category as CpcbCategory);
  }
  if (scale === 'US_EPA') {
    return US_EPA_CATEGORIES.includes(category as UsEpaCategory);
  }
  return false;
}
