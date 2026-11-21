import {
  DayPeriodPlan,
  HouseholdPersona,
  SafeWindowSlot,
  SafeWindowSummary,
} from '@/types/airqua';

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

/**
 * Helper to determine ventilation status for a given hourly PM2.5 reading.
 */
function getVentilationStatus(pm25: number | null): 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN' {
  if (pm25 === null || isNaN(pm25)) return 'UNKNOWN';
  if (pm25 <= 30) return 'BEST';
  if (pm25 <= 60) return 'CAUTION';
  return 'AVOID';
}

/**
 * Helper to determine outdoor activity status for a given hourly PM2.5 reading.
 */
function getOutdoorStatus(pm25: number | null): 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN' {
  if (pm25 === null || isNaN(pm25)) return 'UNKNOWN';
  if (pm25 <= 30) return 'BEST';
  if (pm25 <= 90) return 'CAUTION';
  return 'AVOID';
}

/**
 * Extracts the local hour (0-23) from an ISO time string.
 */
function getHourOfDay(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours();
}

/**
 * Generates tailored Morning/Afternoon/Evening guidance adapting dynamically
 * to both hourly PM2.5 risk level and HouseholdPersona.
 */
export function generatePersonaDayPeriodPlan(
  period: 'MORNING' | 'AFTERNOON' | 'EVENING',
  timeRange: string,
  avgPm25: number | null,
  persona: HouseholdPersona
): DayPeriodPlan {
  const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN' =
    avgPm25 === null || isNaN(avgPm25)
      ? 'UNKNOWN'
      : avgPm25 <= 30
      ? 'LOW'
      : avgPm25 <= 90
      ? 'MODERATE'
      : 'HIGH';

  // Guidance matrix: [Persona][Period][RiskLevel]
  const guidanceMatrix: Record<
    HouseholdPersona,
    Record<
      'MORNING' | 'AFTERNOON' | 'EVENING',
      Record<'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN', { headline: string; action: string; why: string }>
    >
  > = {
    COMMUTER: {
      MORNING: {
        LOW: {
          headline: 'Clean Morning Commute',
          action: 'Walk or cycle to the metro station freely; keep vehicle windows down if desired.',
          why: 'Ground-level PM2.5 is safely below CPCB limits, reducing respiratory intake.',
        },
        MODERATE: {
          headline: 'Moderate Transit Smog',
          action: 'Use public transit (Metro/Bus) and set car AC to indoor recirculation mode.',
          why: 'Prevents direct vehicle tailpipe exhaust and roadside particulate ingress during rush hour.',
        },
        HIGH: {
          headline: 'Severe Peak Commute Inversion',
          action: 'Wear a tight-fitting N95 mask in transit; travel via underground metro if possible.',
          why: 'Trapped winter boundary inversion creates dangerous particulate peaks along arterial roads.',
        },
        UNKNOWN: {
          headline: 'Morning Commute Guidance',
          action: 'Monitor local air reports and carry an N95 mask as a precaution.',
          why: 'Real-time observation data is unavailable for this morning window.',
        },
      },
      AFTERNOON: {
        LOW: {
          headline: 'Clear Midday Air',
          action: 'Ideal time for outdoor lunch or running corporate errands on foot.',
          why: 'Solar heating and atmospheric mixing have dispersed surface pollutants.',
        },
        MODERATE: {
          headline: 'Tolerable Midday Window',
          action: 'Complete inter-office trips and errands before 17:00 when inversion re-forms.',
          why: 'Boundary layer remains deep, keeping ambient particulate concentrations manageable.',
        },
        HIGH: {
          headline: 'Persistent Midday Haze',
          action: 'Stay indoors in air-conditioned or filtered office spaces; order meals in.',
          why: 'Elevated regional stagnation prevents normal afternoon particulate dispersion.',
        },
        UNKNOWN: {
          headline: 'Midday Errand Guidance',
          action: 'Prefer indoor connected pathways and keep transit windows closed.',
          why: 'Forecast data for this window is currently incomplete.',
        },
      },
      EVENING: {
        LOW: {
          headline: 'Pleasant Evening Return',
          action: 'Standard commute home; safe for evening strolls or shopping.',
          why: 'Favorable winds are maintaining clean ambient air quality across the city.',
        },
        MODERATE: {
          headline: 'Evening Commute Caution',
          action: 'Avoid lingering near high-traffic traffic junctions; use closed transit cabins.',
          why: 'Falling temperatures and evening peak traffic begin accumulating surface smoke.',
        },
        HIGH: {
          headline: 'Peak Evening Roadside Smog',
          action: 'Commute directly home; wear an N95 mask; seal car cabin immediately.',
          why: 'Severe combination of evening rush-hour exhaust and nocturnal temperature inversion.',
        },
        UNKNOWN: {
          headline: 'Evening Commute Guidance',
          action: 'Wear an N95 mask during travel and head straight indoors.',
          why: 'Evening forecast reading is unavailable.',
        },
      },
    },
    FAMILY_KIDS: {
      MORNING: {
        LOW: {
          headline: 'Safe for School & Morning Play',
          action: 'Children can participate in outdoor school assemblies and morning playground activities.',
          why: 'PM2.5 concentration is within healthy physiological thresholds for developing lungs.',
        },
        MODERATE: {
          headline: 'Cautious Morning School Hours',
          action: 'Request light playground activities; keep classroom windows closed facing roads.',
          why: 'Children breathe more air per kilogram of body weight, increasing toxic absorption during smog.',
        },
        HIGH: {
          headline: 'Hazardous Morning Inversion for Kids',
          action: 'Keep children indoors; cancel outdoor school assemblies; run bedroom purifiers.',
          why: 'Dense winter ground smog causes acute bronchial irritation and asthma flare-ups in children.',
        },
        UNKNOWN: {
          headline: 'Morning Child Health Caution',
          action: 'Keep children in well-ventilated indoor spaces and monitor symptoms.',
          why: 'Air quality reading is currently unverified for this period.',
        },
      },
      AFTERNOON: {
        LOW: {
          headline: 'Optimal Outdoor Playtime',
          action: 'Great window for park visits, cycling, and after-school sports.',
          why: 'Atmospheric mixing has swept out surface smoke, providing the cleanest air of the day.',
        },
        MODERATE: {
          headline: 'Managed Outdoor Play Window',
          action: 'Schedule outdoor sports between 13:00 and 16:00, with hydration breaks.',
          why: 'Midday sunlight breaks the surface inversion, offering the lowest particulate exposure of the day.',
        },
        HIGH: {
          headline: 'Restricted Afternoon Play',
          action: 'Replace outdoor playground time with indoor board games or library visits.',
          why: 'Sustained toxic PM2.5 levels remain dangerous even during peak solar heating.',
        },
        UNKNOWN: {
          headline: 'Afternoon Play Guidance',
          action: 'Supervise indoor playtime and keep doors closed.',
          why: 'Hourly data is unavailable for this time frame.',
        },
      },
      EVENING: {
        LOW: {
          headline: 'Clean Evening Family Stroll',
          action: 'Safe for evening park walks, playground visits, and balcony time.',
          why: 'Clean air conditions allow healthy outdoor family recreation.',
        },
        MODERATE: {
          headline: 'Move Kids Indoors by Sunset',
          action: 'Conclude outdoor park play by 17:30 before smog settles; wet-mop floors.',
          why: 'Cooling evening air traps vehicular fumes and dust near ground level where children play.',
        },
        HIGH: {
          headline: 'Lock Windows & Filter Nursery',
          action: 'Keep children strictly indoors; run HEPA air purifiers in bedrooms; avoid frying foods.',
          why: 'Nighttime smog concentration peaks rapidly, entering living spaces through unsealed gaps.',
        },
        UNKNOWN: {
          headline: 'Evening Child Protection',
          action: 'Keep children indoors and avoid incense or mosquito coils in living areas.',
          why: 'Forecast data is currently unverified.',
        },
      },
    },
    SENIOR: {
      MORNING: {
        LOW: {
          headline: 'Favorable for Morning Walk',
          action: 'Enjoy gentle outdoor garden walking; practice breathing exercises in open air.',
          why: 'Ambient particulate levels are safely within non-irritating thresholds.',
        },
        MODERATE: {
          headline: 'Postpone Early Morning Walk',
          action: 'Shift morning walk to 10:30 AM or walk indoors in a hallway.',
          why: 'Early morning cold air triggers bronchospasms and elevates cardiac workload.',
        },
        HIGH: {
          headline: 'Cancel Outdoor Morning Walk',
          action: 'Stay strictly indoors; perform gentle indoor yoga/stretching; take prescribed inhalers.',
          why: 'Severe morning particulate peaks dramatically increase risks of angina and acute respiratory distress.',
        },
        UNKNOWN: {
          headline: 'Morning Health Precaution',
          action: 'Stay indoors in a comfortable environment and monitor comfort levels.',
          why: 'Air quality reading is currently unavailable.',
        },
      },
      AFTERNOON: {
        LOW: {
          headline: 'Pleasant Sunlight & Clean Air',
          action: 'Ideal time for sitting on the patio, running banking errands, or visiting neighbors.',
          why: 'Sunlight and low PM2.5 provide restorative outdoor time without pulmonary strain.',
        },
        MODERATE: {
          headline: 'Safest Outdoor Window for Seniors',
          action: 'Run outdoor errands or take gentle walks between 12:00 and 15:30.',
          why: 'Maximum thermal dispersion makes midday the lowest-pollution window for elderly lungs.',
        },
        HIGH: {
          headline: 'Indoor Rest Advised',
          action: 'Rest in a filtered room; drink warm fluids; avoid dusty indoor chores.',
          why: 'Unrelenting particulate load places continuous strain on cardiovascular function.',
        },
        UNKNOWN: {
          headline: 'Afternoon Senior Guidance',
          action: 'Stay rested indoors and maintain adequate hydration.',
          why: 'Hourly data is unavailable for this time frame.',
        },
      },
      EVENING: {
        LOW: {
          headline: 'Peaceful Evening Stroll',
          action: 'Safe for short garden walks and visiting community centers.',
          why: 'Air quality remains benign across residential areas.',
        },
        MODERATE: {
          headline: 'Early Indoor Retirement',
          action: 'Complete outdoor strolls before twilight; keep bedroom windows latched.',
          why: 'Rapid evening cooling traps wood smoke and road dust close to the ground.',
        },
        HIGH: {
          headline: 'Full Indoor Protection Protocol',
          action: 'Seal bedroom gaps with damp towels; run purifier continuously; keep emergency meds close.',
          why: 'Evening toxic smog spikes trigger nighttime coughing, sleep apnea, and cardiac stress in seniors.',
        },
        UNKNOWN: {
          headline: 'Evening Senior Protection',
          action: 'Remain in a closed, comfortable room with warm fluids.',
          why: 'Forecast reading is unavailable.',
        },
      },
    },
    STUDENT_ATHLETE: {
      MORNING: {
        LOW: {
          headline: 'Optimal for Outdoor Training',
          action: 'Full outdoor cardio, interval sprints, or team field practice.',
          why: 'Low particulate levels support high minute-ventilation without pulmonary epithelial damage.',
        },
        MODERATE: {
          headline: 'Reduce High-Intensity Cardio Outdoors',
          action: 'Shift outdoor sprint drills to technical/skill training; delay heavy endurance running.',
          why: 'Athletes breathe 10–20x more air during intense workouts, multiplying PM2.5 lung deposition.',
        },
        HIGH: {
          headline: 'Outdoor Cardio Prohibited',
          action: 'Cancel outdoor track/field practice; move workout to indoor gym or stationary bike.',
          why: 'Deep lung deposition of toxic particles during heavy exertion triggers exercise-induced bronchoconstriction.',
        },
        UNKNOWN: {
          headline: 'Morning Training Caution',
          action: 'Warm up indoors and assess breathing comfort before outdoor drills.',
          why: 'Live air quality reading is unavailable.',
        },
      },
      AFTERNOON: {
        LOW: {
          headline: 'Prime Window for Matches & Drills',
          action: 'Great for competitive football, cricket, running, and tennis training.',
          why: 'Clean air combined with solar thermal lift ensures safe athletic performance.',
        },
        MODERATE: {
          headline: 'Best Window for Outdoor Workouts',
          action: 'Schedule intense outdoor conditioning between 13:00 and 16:30.',
          why: 'Midday thermal dispersion provides the minimum daily particulate concentration.',
        },
        HIGH: {
          headline: 'Switch to Indoor Conditioning',
          action: 'Conduct resistance and mobility training indoors; avoid high-cadence outdoor cardio.',
          why: 'Ambient particulate levels remain toxic despite daylight hours.',
        },
        UNKNOWN: {
          headline: 'Afternoon Athletic Guidance',
          action: 'Prefer indoor gymnasium conditioning over outdoor field workouts.',
          why: 'Data is unavailable for this time frame.',
        },
      },
      EVENING: {
        LOW: {
          headline: 'Safe for Evening Fixtures',
          action: 'Full participation in evening matches, turf football, or runs.',
          why: 'Clean atmospheric conditions ensure low athlete exposure.',
        },
        MODERATE: {
          headline: 'Wrap Up Practice Before Twilight',
          action: 'End field training by 17:30; switch evening sessions to indoor recovery and stretching.',
          why: 'Evening traffic fumes concentrate near the surface as ground temperature drops.',
        },
        HIGH: {
          headline: 'Severe Inversion: No Outdoor Drills',
          action: 'Cancel all outdoor turf games and runs; focus on foam rolling and recovery indoors.',
          why: 'Intense breathing in nocturnal smog causes immediate airway inflammation and drops VO2 max.',
        },
        UNKNOWN: {
          headline: 'Evening Training Guidance',
          action: 'Conduct cool-down and stretching indoors in a dust-free space.',
          why: 'Forecast data is unavailable.',
        },
      },
    },
  };

  const plan = guidanceMatrix[persona][period][riskLevel];

  return {
    period,
    timeRange,
    avgPm25: avgPm25 !== null ? Math.round(avgPm25 * 10) / 10 : null,
    riskLevel,
    headline: plan.headline,
    personaAction: plan.action,
    whyItMatters: plan.why,
  };
}

/**
 * Computes 2-hour rolling averages and extracts:
 * - Best Window to Ventilate (lowest 2h rolling avg PM2.5 in next 24h)
 * - Best Window for Outdoor Errands (lowest 2h rolling avg PM2.5 within 06:00-20:00)
 * - Peak Smog Window (highest 2h rolling avg PM2.5 in next 24h)
 * - Morning/Afternoon/Evening DayPeriodPlan[] tailored to HouseholdPersona
 * - Hourly SafeWindowSlot[] array
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

  // 1. Build hourly slots
  const hourlySlots: SafeWindowSlot[] = hourlyData.map((slot) => ({
    hourISO: slot.timeISO,
    pm25: slot.pm25,
    pm10: slot.pm10,
    aqiEstimate: slot.usAqi ?? null,
    ventilationStatus: getVentilationStatus(slot.pm25),
    outdoorStatus: getOutdoorStatus(slot.pm25),
  }));

  // Limit window search to the first 24 hours of data
  const searchSlots = hourlyData.slice(0, 24);

  // 2. Compute 2-hour rolling averages
  let minVentilation: WindowResult | null = null;
  let minOutdoor: WindowResult | null = null;
  let maxSmog: WindowResult | null = null;

  for (let i = 0; i < searchSlots.length - 1; i++) {
    const s1 = searchSlots[i];
    const s2 = searchSlots[i + 1];

    if (s1.pm25 !== null && s2.pm25 !== null) {
      const avg = (s1.pm25 + s2.pm25) / 2;
      const windowObj: WindowResult = {
        startISO: s1.timeISO,
        endISO: s2.timeISO,
        avgPm25: Math.round(avg * 10) / 10,
      };

      // Best ventilation: overall minimum 2h average
      if (!minVentilation || avg < minVentilation.avgPm25) {
        minVentilation = windowObj;
      }

      // Peak smog: overall maximum 2h average
      if (!maxSmog || avg > maxSmog.avgPm25) {
        maxSmog = windowObj;
      }

      // Best outdoor errands: restricted to daytime (06:00 to 20:00 local time)
      const startHour = getHourOfDay(s1.timeISO);
      if (startHour >= 6 && startHour <= 20) {
        if (!minOutdoor || avg < minOutdoor.avgPm25) {
          minOutdoor = windowObj;
        }
      }
    }
  }

  // 3. Compute Morning / Afternoon / Evening averages for Day 1
  const morningPm25s: number[] = [];
  const afternoonPm25s: number[] = [];
  const eveningPm25s: number[] = [];

  for (const slot of searchSlots) {
    if (slot.pm25 !== null) {
      const hour = getHourOfDay(slot.timeISO);
      if (hour >= 6 && hour < 12) {
        morningPm25s.push(slot.pm25);
      } else if (hour >= 12 && hour < 18) {
        afternoonPm25s.push(slot.pm25);
      } else if (hour >= 18 && hour <= 22) {
        eveningPm25s.push(slot.pm25);
      }
    }
  }

  const calcAvg = (arr: number[]): number | null =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const dailyPeriods: DayPeriodPlan[] = [
    generatePersonaDayPeriodPlan(
      'MORNING',
      '06:00 - 12:00',
      calcAvg(morningPm25s),
      persona
    ),
    generatePersonaDayPeriodPlan(
      'AFTERNOON',
      '12:00 - 18:00',
      calcAvg(afternoonPm25s),
      persona
    ),
    generatePersonaDayPeriodPlan(
      'EVENING',
      '18:00 - 23:00',
      calcAvg(eveningPm25s),
      persona
    ),
  ];

  return {
    bestVentilationWindow: minVentilation,
    bestOutdoorWindow: minOutdoor,
    peakSmogWindow: maxSmog,
    dailyPeriods,
    hourlySlots,
    dataKind: 'FORECAST',
  };
}
