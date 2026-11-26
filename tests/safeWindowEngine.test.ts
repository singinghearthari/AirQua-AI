import { describe, it, expect } from 'vitest';
import {
  computeSafeWindowSummary,
  generatePersonaDayPeriodPlan,
  HourlySlotInput,
} from '@/lib/aqi/safeWindowEngine';
import { HouseholdPersona } from '@/types/airqua';

describe('SafeWindowEngine', () => {
  // Generate synthetic 24h data with a distinct midday dip and morning/evening smog peaks
  const synthetic24hData: HourlySlotInput[] = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    const timeISO = `2026-11-21T${hour}:00:00+05:30`;

    // High in early morning (00:00–08:00) & late evening (19:00–23:00)
    // Low in afternoon (13:00–16:00)
    let pm25 = 160;
    if (i >= 13 && i <= 15) {
      pm25 = 45; // Cleanest afternoon window
    } else if (i >= 6 && i <= 8) {
      pm25 = 260; // Peak morning smog
    }

    return {
      timeISO,
      pm25,
      pm10: pm25 * 1.6,
      usAqi: Math.round(pm25 * 1.2),
    };
  });

  describe('Rolling 2-Hour Windows', () => {
    it('accurately identifies Best Ventilation Window (overall lowest 2h PM2.5)', () => {
      const summary = computeSafeWindowSummary(synthetic24hData, 'COMMUTER');

      expect(summary.bestVentilationWindow).not.toBeNull();
      // Should pick hours 13-14 or 14-15 where PM2.5 is 45
      expect(summary.bestVentilationWindow!.avgPm25).toBe(45);
      expect(summary.bestVentilationWindow!.startISO).toContain('13:00');
    });

    it('accurately identifies Best Window for Outdoor Errands within 06:00-20:00', () => {
      const summary = computeSafeWindowSummary(synthetic24hData, 'FAMILY_KIDS');

      expect(summary.bestOutdoorWindow).not.toBeNull();
      expect(summary.bestOutdoorWindow!.avgPm25).toBe(45);
      expect(summary.bestOutdoorWindow!.startISO).toContain('13:00');
    });

    it('accurately identifies Peak Smog Window (highest 2h PM2.5)', () => {
      const summary = computeSafeWindowSummary(synthetic24hData, 'SENIOR');

      expect(summary.peakSmogWindow).not.toBeNull();
      expect(summary.peakSmogWindow!.avgPm25).toBe(260);
      expect(summary.peakSmogWindow!.startISO).toContain('06:00');
    });
  });

  describe('Morning / Afternoon / Evening Persona Plans', () => {
    const personas: HouseholdPersona[] = [
      'COMMUTER',
      'FAMILY_KIDS',
      'SENIOR',
      'STUDENT_ATHLETE',
    ];

    it('generates exactly 3 periods (Morning, Afternoon, Evening) for each persona', () => {
      for (const p of personas) {
        const summary = computeSafeWindowSummary(synthetic24hData, p);
        expect(summary.dailyPeriods).toHaveLength(3);
        expect(summary.dailyPeriods[0].period).toBe('MORNING');
        expect(summary.dailyPeriods[1].period).toBe('AFTERNOON');
        expect(summary.dailyPeriods[2].period).toBe('EVENING');
      }
    });

    it('delivers visibly distinct, persona-specific actions for the same air conditions', () => {
      const commuterSummary = computeSafeWindowSummary(synthetic24hData, 'COMMUTER');
      const seniorSummary = computeSafeWindowSummary(synthetic24hData, 'SENIOR');
      const kidsSummary = computeSafeWindowSummary(synthetic24hData, 'FAMILY_KIDS');
      const athleteSummary = computeSafeWindowSummary(synthetic24hData, 'STUDENT_ATHLETE');

      const morningCommuter = commuterSummary.dailyPeriods[0];
      const morningSenior = seniorSummary.dailyPeriods[0];
      const morningKids = kidsSummary.dailyPeriods[0];
      const morningAthlete = athleteSummary.dailyPeriods[0];

      // Commuter focuses on transit & N95 during commute
      expect(morningCommuter.personaAction).toMatch(/transit|metro|recirculation|mask/i);

      // Senior focuses on indoor walking or cancelling morning walk
      expect(morningSenior.personaAction).toMatch(/indoor|walk|hallway|stretching/i);

      // Family with kids focuses on school/playground/nursery safety
      expect(morningKids.personaAction).toMatch(/school|playground|children|play/i);

      // Student athlete focuses on cardio/workout/training location
      expect(morningAthlete.personaAction).toMatch(/cardio|track|gym|practice|training/i);

      // Confirm all 4 actions are mutually distinct
      const actions = [
        morningCommuter.personaAction,
        morningSenior.personaAction,
        morningKids.personaAction,
        morningAthlete.personaAction,
      ];
      const uniqueActions = new Set(actions);
      expect(uniqueActions.size).toBe(4);
    });

    it('dynamically adapts riskLevel and guidance when PM2.5 changes', () => {
      const lowPlan = generatePersonaDayPeriodPlan('MORNING', '06:00 - 12:00', 20, 'STUDENT_ATHLETE');
      expect(lowPlan.riskLevel).toBe('LOW');
      expect(lowPlan.headline).toContain('Optimal');

      const highPlan = generatePersonaDayPeriodPlan('MORNING', '06:00 - 12:00', 180, 'STUDENT_ATHLETE');
      expect(highPlan.riskLevel).toBe('HIGH');
      expect(highPlan.headline).toContain('Prohibited');
    });
  });

  describe('Hourly Slots Classification', () => {
    it('assigns correct ventilation and outdoor status to each slot', () => {
      const summary = computeSafeWindowSummary(synthetic24hData, 'COMMUTER');
      expect(summary.hourlySlots).toHaveLength(24);

      // Clean hour (PM2.5 = 45): Ventilation should be CAUTION (31-60), Outdoor should be CAUTION (31-90)
      const cleanHour = summary.hourlySlots.find((s) => s.hourISO.includes('13:00'));
      expect(cleanHour).toBeDefined();
      expect(cleanHour!.ventilationStatus).toBe('CAUTION');
      expect(cleanHour!.outdoorStatus).toBe('CAUTION');

      // Peak hour (PM2.5 = 260): Both should be AVOID
      const peakHour = summary.hourlySlots.find((s) => s.hourISO.includes('06:00'));
      expect(peakHour).toBeDefined();
      expect(peakHour!.ventilationStatus).toBe('AVOID');
      expect(peakHour!.outdoorStatus).toBe('AVOID');
    });

    it('handles empty forecast array and zero/extreme PM2.5 boundary values safely', () => {
      const emptySummary = computeSafeWindowSummary([], 'COMMUTER');
      expect(emptySummary.bestVentilationWindow).toBeNull();
      expect(emptySummary.bestOutdoorWindow).toBeNull();
      expect(emptySummary.peakSmogWindow).toBeNull();
      expect(emptySummary.hourlySlots).toHaveLength(0);

      const zeroPlan = generatePersonaDayPeriodPlan('AFTERNOON', '12:00 - 17:00', 0, 'SENIOR');
      expect(zeroPlan.riskLevel).toBe('LOW');

      const extremePlan = generatePersonaDayPeriodPlan('EVENING', '17:00 - 23:00', 600, 'SENIOR');
      expect(extremePlan.riskLevel).toBe('HIGH');
    });
  });
});
