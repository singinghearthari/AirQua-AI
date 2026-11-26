import { DayPeriodPlan, HouseholdPersona } from '@/types/airqua';

type DayPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
type GuidanceTuple = readonly [headline: string, action: string, why: string];

type PersonaGuidanceMap = Record<DayPeriod, Record<RiskLevel, GuidanceTuple>>;

const GUIDANCE_MATRIX: Record<HouseholdPersona, PersonaGuidanceMap> = {
  COMMUTER: {
    MORNING: {
      LOW: ['Clean Morning Commute', 'Walk or cycle to the metro station freely; keep vehicle windows down if desired.', 'Ground-level PM2.5 is safely below CPCB limits, reducing respiratory intake.'],
      MODERATE: ['Moderate Transit Smog', 'Use public transit (Metro/Bus) and set car AC to indoor recirculation mode.', 'Prevents direct vehicle tailpipe exhaust and roadside particulate ingress during rush hour.'],
      HIGH: ['Severe Peak Commute Inversion', 'Wear a tight-fitting N95 mask in transit; travel via underground metro if possible.', 'Trapped winter boundary inversion creates dangerous particulate peaks along arterial roads.'],
      UNKNOWN: ['Morning Commute Guidance', 'Monitor local air reports and carry an N95 mask as a precaution.', 'Real-time observation data is unavailable for this morning window.'],
    },
    AFTERNOON: {
      LOW: ['Clear Midday Air', 'Ideal time for outdoor lunch or running corporate errands on foot.', 'Solar heating and atmospheric mixing have dispersed surface pollutants.'],
      MODERATE: ['Tolerable Midday Window', 'Complete inter-office trips and errands before 17:00 when inversion re-forms.', 'Boundary layer remains deep, keeping ambient particulate concentrations manageable.'],
      HIGH: ['Persistent Midday Haze', 'Stay indoors in air-conditioned or filtered office spaces; order meals in.', 'Elevated regional stagnation prevents normal afternoon particulate dispersion.'],
      UNKNOWN: ['Midday Errand Guidance', 'Prefer indoor connected pathways and keep transit windows closed.', 'Forecast data for this window is currently incomplete.'],
    },
    EVENING: {
      LOW: ['Pleasant Evening Return', 'Standard commute home; safe for evening strolls or shopping.', 'Favorable winds are maintaining clean ambient air quality across the city.'],
      MODERATE: ['Evening Commute Caution', 'Avoid lingering near high-traffic traffic junctions; use closed transit cabins.', 'Falling temperatures and evening peak traffic begin accumulating surface smoke.'],
      HIGH: ['Peak Evening Roadside Smog', 'Commute directly home; wear an N95 mask; seal car cabin immediately.', 'Severe combination of evening rush-hour exhaust and nocturnal temperature inversion.'],
      UNKNOWN: ['Evening Commute Guidance', 'Wear an N95 mask during travel and head straight indoors.', 'Evening forecast reading is unavailable.'],
    },
  },
  FAMILY_KIDS: {
    MORNING: {
      LOW: ['Safe for School & Morning Play', 'Children can participate in outdoor school assemblies and morning playground activities.', 'PM2.5 concentration is within healthy physiological thresholds for developing lungs.'],
      MODERATE: ['Cautious Morning School Hours', 'Request light playground activities; keep classroom windows closed facing roads.', 'Children breathe more air per kilogram of body weight, increasing toxic absorption during smog.'],
      HIGH: ['Hazardous Morning Inversion for Kids', 'Keep children indoors; cancel outdoor school assemblies; run bedroom purifiers.', 'Dense winter ground smog causes acute bronchial irritation and asthma flare-ups in children.'],
      UNKNOWN: ['Morning Child Health Caution', 'Keep children in well-ventilated indoor spaces and monitor symptoms.', 'Air quality reading is currently unverified for this period.'],
    },
    AFTERNOON: {
      LOW: ['Optimal Outdoor Playtime', 'Great window for park visits, cycling, and after-school sports.', 'Atmospheric mixing has swept out surface smoke, providing the cleanest air of the day.'],
      MODERATE: ['Managed Outdoor Play Window', 'Schedule outdoor sports between 13:00 and 16:00, with hydration breaks.', 'Midday sunlight breaks the surface inversion, offering the lowest particulate exposure of the day.'],
      HIGH: ['Restricted Afternoon Play', 'Replace outdoor playground time with indoor board games or library visits.', 'Sustained toxic PM2.5 levels remain dangerous even during peak solar heating.'],
      UNKNOWN: ['Afternoon Play Guidance', 'Supervise indoor playtime and keep doors closed.', 'Hourly data is unavailable for this time frame.'],
    },
    EVENING: {
      LOW: ['Clean Evening Family Stroll', 'Safe for evening park walks, playground visits, and balcony time.', 'Clean air conditions allow healthy outdoor family recreation.'],
      MODERATE: ['Move Kids Indoors by Sunset', 'Conclude outdoor park play by 17:30 before smog settles; wet-mop floors.', 'Cooling evening air traps vehicular fumes and dust near ground level where children play.'],
      HIGH: ['Lock Windows & Filter Nursery', 'Keep children strictly indoors; run HEPA air purifiers in bedrooms; avoid frying foods.', 'Nighttime smog concentration peaks rapidly, entering living spaces through unsealed gaps.'],
      UNKNOWN: ['Evening Child Protection', 'Keep children indoors and avoid incense or mosquito coils in living areas.', 'Forecast data is currently unverified.'],
    },
  },
  SENIOR: {
    MORNING: {
      LOW: ['Favorable for Morning Walk', 'Enjoy gentle outdoor garden walking; practice breathing exercises in open air.', 'Ambient particulate levels are safely within non-irritating thresholds.'],
      MODERATE: ['Postpone Early Morning Walk', 'Shift morning walk to 10:30 AM or walk indoors in a hallway.', 'Early morning cold air triggers bronchospasms and elevates cardiac workload.'],
      HIGH: ['Cancel Outdoor Morning Walk', 'Stay strictly indoors; perform gentle indoor yoga/stretching; take prescribed inhalers.', 'Severe morning particulate peaks dramatically increase risks of angina and acute respiratory distress.'],
      UNKNOWN: ['Morning Health Precaution', 'Stay indoors in a comfortable environment and monitor comfort levels.', 'Air quality reading is currently unavailable.'],
    },
    AFTERNOON: {
      LOW: ['Pleasant Sunlight & Clean Air', 'Ideal time for sitting on the patio, running banking errands, or visiting neighbors.', 'Sunlight and low PM2.5 provide restorative outdoor time without pulmonary strain.'],
      MODERATE: ['Safest Outdoor Window for Seniors', 'Run outdoor errands or take gentle walks between 12:00 and 15:30.', 'Maximum thermal dispersion makes midday the lowest-pollution window for elderly lungs.'],
      HIGH: ['Indoor Rest Advised', 'Rest in a filtered room; drink warm fluids; avoid dusty indoor chores.', 'Unrelenting particulate load places continuous strain on cardiovascular function.'],
      UNKNOWN: ['Afternoon Senior Guidance', 'Stay rested indoors and maintain adequate hydration.', 'Hourly data is unavailable for this time frame.'],
    },
    EVENING: {
      LOW: ['Peaceful Evening Stroll', 'Safe for short garden walks and visiting community centers.', 'Air quality remains benign across residential areas.'],
      MODERATE: ['Early Indoor Retirement', 'Complete outdoor strolls before twilight; keep bedroom windows latched.', 'Rapid evening cooling traps wood smoke and road dust close to the ground.'],
      HIGH: ['Full Indoor Protection Protocol', 'Seal bedroom gaps with damp towels; run purifier continuously; keep emergency meds close.', 'Evening toxic smog spikes trigger nighttime coughing, sleep apnea, and cardiac stress in seniors.'],
      UNKNOWN: ['Evening Senior Protection', 'Remain in a closed, comfortable room with warm fluids.', 'Forecast reading is unavailable.'],
    },
  },
  STUDENT_ATHLETE: {
    MORNING: {
      LOW: ['Optimal for Outdoor Training', 'Full outdoor cardio, interval sprints, or team field practice.', 'Low particulate levels support high minute-ventilation without pulmonary epithelial damage.'],
      MODERATE: ['Reduce High-Intensity Cardio Outdoors', 'Shift outdoor sprint drills to technical/skill training; delay heavy endurance running.', 'Athletes breathe 10–20x more air during intense workouts, multiplying PM2.5 lung deposition.'],
      HIGH: ['Outdoor Cardio Prohibited', 'Cancel outdoor track/field practice; move workout to indoor gym or stationary bike.', 'Deep lung deposition of toxic particles during heavy exertion triggers exercise-induced bronchoconstriction.'],
      UNKNOWN: ['Morning Training Caution', 'Warm up indoors and assess breathing comfort before outdoor drills.', 'Live air quality reading is unavailable.'],
    },
    AFTERNOON: {
      LOW: ['Prime Window for Matches & Drills', 'Great for competitive football, cricket, running, and tennis training.', 'Clean air combined with solar thermal lift ensures safe athletic performance.'],
      MODERATE: ['Best Window for Outdoor Workouts', 'Schedule intense outdoor conditioning between 13:00 and 16:30.', 'Midday thermal dispersion provides the minimum daily particulate concentration.'],
      HIGH: ['Switch to Indoor Conditioning', 'Conduct resistance and mobility training indoors; avoid high-cadence outdoor cardio.', 'Ambient particulate levels remain toxic despite daylight hours.'],
      UNKNOWN: ['Afternoon Athletic Guidance', 'Prefer indoor gymnasium conditioning over outdoor field workouts.', 'Data is unavailable for this time frame.'],
    },
    EVENING: {
      LOW: ['Safe for Evening Fixtures', 'Full participation in evening matches, turf football, or runs.', 'Clean atmospheric conditions ensure low athlete exposure.'],
      MODERATE: ['Wrap Up Practice Before Twilight', 'End field training by 17:30; switch evening sessions to indoor recovery and stretching.', 'Evening traffic fumes concentrate near the surface as ground temperature drops.'],
      HIGH: ['Severe Inversion: No Outdoor Drills', 'Cancel all outdoor turf games and runs; focus on foam rolling and recovery indoors.', 'Intense breathing in nocturnal smog causes immediate airway inflammation and drops VO2 max.'],
      UNKNOWN: ['Evening Training Guidance', 'Conduct cool-down and stretching indoors in a dust-free space.', 'Forecast data is unavailable.'],
    },
  },
};

/**
 * Maps an average PM2.5 concentration to a deterministic risk tier.
 */
function classifyPm25RiskLevel(avgPm25: number | null): RiskLevel {
  if (avgPm25 === null || isNaN(avgPm25)) return 'UNKNOWN';
  if (avgPm25 <= 30) return 'LOW';
  if (avgPm25 <= 90) return 'MODERATE';
  return 'HIGH';
}

/**
 * Generates tailored Morning/Afternoon/Evening guidance adapting deterministically
 * to both hourly PM2.5 risk level and the active `HouseholdPersona`.
 */
export function generatePersonaDayPeriodPlan(
  period: DayPeriod,
  timeRange: string,
  avgPm25: number | null,
  persona: HouseholdPersona
): DayPeriodPlan {
  const riskLevel = classifyPm25RiskLevel(avgPm25);
  const [headline, personaAction, whyItMatters] = GUIDANCE_MATRIX[persona][period][riskLevel];

  return {
    period,
    timeRange,
    avgPm25: avgPm25 !== null && !isNaN(avgPm25) ? Math.round(avgPm25 * 10) / 10 : null,
    riskLevel,
    headline,
    personaAction,
    whyItMatters,
  };
}
