import { CityPreset, EvaluatorPreset, HouseholdPersona } from '@/types/airqua';

export const FEATURED_CITIES: CityPreset[] = [
  {
    name: 'Delhi',
    region: 'NCR',
    latitude: 28.6139,
    longitude: 77.209,
  },
  {
    name: 'Noida',
    region: 'Uttar Pradesh',
    latitude: 28.5355,
    longitude: 77.391,
  },
  {
    name: 'Mumbai',
    region: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    name: 'Kolkata',
    region: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
  },
  {
    name: 'Bengaluru',
    region: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    name: 'Chennai',
    region: 'Tamil Nadu',
    latitude: 13.0827,
    longitude: 80.2707,
  },
];

export const EVALUATOR_PRESETS: EvaluatorPreset[] = [
  {
    id: 'delhi-family',
    label: 'Delhi • Family with Kids',
    city: FEATURED_CITIES[0],
    persona: 'FAMILY_KIDS',
    scale: 'IN_CPCB',
    description: 'Severe winter smog with focus on school hours, indoor playtime, and nursery filtration.',
  },
  {
    id: 'mumbai-commuter',
    label: 'Mumbai • Daily Commuter',
    city: FEATURED_CITIES[2],
    persona: 'COMMUTER',
    scale: 'IN_CPCB',
    description: 'High traffic density corridor with public transit timing and vehicle recirculation recommendations.',
  },
  {
    id: 'kolkata-senior',
    label: 'Kolkata • Senior Citizen',
    city: FEATURED_CITIES[3],
    persona: 'SENIOR',
    scale: 'IN_CPCB',
    description: 'Evening particulate spike caution with safe midday sunlight strolling windows.',
  },
  {
    id: 'noida-athlete',
    label: 'Noida • Student Athlete',
    city: FEATURED_CITIES[1],
    persona: 'STUDENT_ATHLETE',
    scale: 'IN_CPCB',
    description: 'High-exertion training safety with cardio shift to lowest pollution window.',
  },
];

export const PERSONA_LABELS: Record<
  HouseholdPersona,
  { en: string; ta: string; subEn: string; subTa: string }
> = {
  FAMILY_KIDS: {
    en: 'Family with Kids',
    ta: 'குழந்தைகள் உள்ள குடும்பம்',
    subEn: 'School & outdoor play safety',
    subTa: 'பள்ளி மற்றும் விளையாட்டு பாதுகாப்பு',
  },
  COMMUTER: {
    en: 'Daily Commuter',
    ta: 'தினசரி பயணி',
    subEn: 'Metro & road exposure timing',
    subTa: 'மெட்ரோ மற்றும் பயண பாதுகாப்பு',
  },
  SENIOR: {
    en: 'Senior Citizen',
    ta: 'முதியவர்கள்',
    subEn: 'Gentle walk & indoor care',
    subTa: 'மிதமான நடை & உள்அரங்கு பராமரிப்பு',
  },
  STUDENT_ATHLETE: {
    en: 'Student Athlete',
    ta: 'விளையாட்டு வீரர்',
    subEn: 'Cardio & training hours',
    subTa: 'உடற்பயிற்சி & பயிற்சி நேரம்',
  },
};
