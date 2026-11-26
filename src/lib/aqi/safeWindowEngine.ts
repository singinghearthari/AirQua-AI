import {
  DayPeriodPlan,
  HouseholdPersona,
  SafeWindowSlot,
  SafeWindowSummary,
} from '@/types/airqua';
import { generatePersonaDayPeriodPlan } from './dailyPeriodPlanner';

export { generatePersonaDayPeriodPlan } from './dailyPeriodPlanner';

export interface HourlySlotInput {
  timeISO: string;
  pm25: number | null;
  pm10: number | null;
  usAqi?: number | null;
}

export interface WindowResult {
  startISO: string;
  endISO: string;
  avgPm25: number;
}

function getVentilationStatus(pm25: number | null): 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN' {
  if (pm25 === null || isNaN(pm25)) return 'UNKNOWN';
  if (pm25 <= 30) return 'BEST';
  if (pm25 <= 60) return 'CAUTION';
  return 'AVOID';
}

function getOutdoorStatus(pm25: number | null): 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN' {
  if (pm25 === null || isNaN(pm25)) return 'UNKNOWN';
  if (pm25 <= 30) return 'BEST';
  if (pm25 <= 90) return 'CAUTION';
  return 'AVOID';
}

function getHourOfDay(isoString: string): number {
  return new Date(isoString).getHours();
}

function calcAverage(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function findRollingWindows(searchSlots: HourlySlotInput[]): {
  bestVentilationWindow: WindowResult | null;
  bestOutdoorWindow: WindowResult | null;
  peakSmogWindow: WindowResult | null;
} {
  let minVentilation: WindowResult | null = null;
  let minOutdoor: WindowResult | null = null;
  let maxSmog: WindowResult | null = null;

  for (let i = 0; i < searchSlots.length - 1; i++) {
    const s1 = searchSlots[i];
    const s2 = searchSlots[i + 1];

    if (s1.pm25 === null || s2.pm25 === null) continue;

    const avg = (s1.pm25 + s2.pm25) / 2;
    const windowObj: WindowResult = {
      startISO: s1.timeISO,
      endISO: s2.timeISO,
      avgPm25: Math.round(avg * 10) / 10,
    };

    if (!minVentilation || avg < minVentilation.avgPm25) {
      minVentilation = windowObj;
    }

    if (!maxSmog || avg > maxSmog.avgPm25) {
      maxSmog = windowObj;
    }

    const startHour = getHourOfDay(s1.timeISO);
    if (startHour >= 6 && startHour <= 20) {
      if (!minOutdoor || avg < minOutdoor.avgPm25) {
        minOutdoor = windowObj;
      }
    }
  }

  return {
    bestVentilationWindow: minVentilation,
    bestOutdoorWindow: minOutdoor,
    peakSmogWindow: maxSmog,
  };
}

function computeDailyPeriods(
  searchSlots: HourlySlotInput[],
  persona: HouseholdPersona
): DayPeriodPlan[] {
  const morningPm25s: number[] = [];
  const afternoonPm25s: number[] = [];
  const eveningPm25s: number[] = [];

  for (const slot of searchSlots) {
    if (slot.pm25 === null) continue;
    const hour = getHourOfDay(slot.timeISO);
    if (hour >= 6 && hour < 12) {
      morningPm25s.push(slot.pm25);
    } else if (hour >= 12 && hour < 18) {
      afternoonPm25s.push(slot.pm25);
    } else if (hour >= 18 && hour <= 22) {
      eveningPm25s.push(slot.pm25);
    }
  }

  return [
    generatePersonaDayPeriodPlan('MORNING', '06:00 - 12:00', calcAverage(morningPm25s), persona),
    generatePersonaDayPeriodPlan('AFTERNOON', '12:00 - 18:00', calcAverage(afternoonPm25s), persona),
    generatePersonaDayPeriodPlan('EVENING', '18:00 - 23:00', calcAverage(eveningPm25s), persona),
  ];
}

/**
 * Deterministically computes 2-hour rolling PM2.5 averages across the next 24 hours to identify
 * the best indoor ventilation window, best daytime outdoor errand window (06:00–20:00),
 * peak smog inversion window, and persona-adapted Morning/Afternoon/Evening plans.
 */
export function computeSafeWindowSummary(
  hourlyData: HourlySlotInput[],
  persona: HouseholdPersona
): SafeWindowSummary {
  if (!hourlyData || hourlyData.length === 0) {
    return {
      bestVentilationWindow: null,
      bestOutdoorWindow: null,
      peakSmogWindow: null,
      dailyPeriods: [
        generatePersonaDayPeriodPlan('MORNING', '06:00 - 12:00', null, persona),
        generatePersonaDayPeriodPlan('AFTERNOON', '12:00 - 18:00', null, persona),
        generatePersonaDayPeriodPlan('EVENING', '18:00 - 23:00', null, persona),
      ],
      hourlySlots: [],
      dataKind: 'FORECAST',
    };
  }

  const hourlySlots: SafeWindowSlot[] = hourlyData.map((slot) => ({
    hourISO: slot.timeISO,
    pm25: slot.pm25,
    pm10: slot.pm10,
    aqiEstimate: slot.usAqi ?? null,
    ventilationStatus: getVentilationStatus(slot.pm25),
    outdoorStatus: getOutdoorStatus(slot.pm25),
  }));

  const searchSlots = hourlyData.slice(0, 24);
  const windows = findRollingWindows(searchSlots);
  const dailyPeriods = computeDailyPeriods(searchSlots, persona);

  return {
    ...windows,
    dailyPeriods,
    hourlySlots,
    dataKind: 'FORECAST',
  };
}
