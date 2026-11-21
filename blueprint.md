# AIRQUA AI — Product & Technical Blueprint (v2 — PromptWars Challenge 6 Aligned)

**Event:** PromptWars | Challenge 6 — Urban Air Quality Assistant  
**Tagline:** Understand the air. Make informed choices. Build cleaner communities.  
**Core Workflow:** `1. OBSERVE` → `2. SCAN` → `3. SIMULATE` → `4. ACT`

---

## 1. Executive Summary

AIRQUA AI is a guest-first, multimodal urban air-quality and sustainable living assistant built for Indian families and communities navigating severe winter smog and urban air pollution. Rather than stopping at a raw AQI number, AIRQUA AI combines real-time, pan-India pollutant data with **Household Persona personalization**, a **24-Hour Safe Window + Morning/Afternoon/Evening planner**, **multimodal Room & Smog visual audits**, an interactive **"What-If" Impact Simulator**, and a **grounded bilingual (English & Tamil) AI consultant**.

### Challenge 6 & Evaluation Alignment
* **3 Core Challenge Pillars:** Low-emission daily routines, indoor air-quality hacks, and sustainable alternatives with transparent impact justifications.
* **6 Automated Grading Signals:** Engineered explicitly for **Code Quality**, **Security**, **Efficiency** (server caching + lightweight assets), **Testing** (`vitest` suite), **Accessibility** (WCAG AA + ARIA), and **Problem Statement Alignment**.
* **Prototype & Evaluator Readiness:** Zero login wall, pan-India real-time coverage, 1-click Evaluator Demo Scenarios, and built-in sample room photos.

---

## 2. Product Goals & Strict Boundaries

| Product Goals | Non-Goals & Hard Boundaries |
| :--- | :--- |
| Translate real-time, pan-India air-quality data into persona-specific daily guidance. | Never diagnose medical conditions or guarantee that any outdoor activity is safe. |
| Provide 24h safe windows + Morning/Afternoon/Evening routines tailored to household profiles. | Never imply outdoor AQI or a room photo is a direct measurement of indoor air quality. |
| Offer visual indoor air-quality audits using Gemini Vision with practical, low-cost fixes. | Never rely on Gemini to generate or invent live AQI or pollutant readings. |
| Separate personal exposure shifts from emissions reductions with documented ranges. | Never claim an exact CO₂ saving without user inputs, emission factors, and uncertainty. |
| Maintain full WCAG AA accessibility and 100% Guest Mode usability. | Never collect sensitive health or location data without explicit user consent. |

---

## 3. Core Product Design (4-Screen Guest-First Architecture)

The app opens directly onto live **Delhi** data with **zero login wall**. Firebase Authentication is optional for syncing saved actions and conversation history (`localStorage` handles persistence in Guest Mode).

### Global Header Controls (Shared Across All 4 Screens)
* **Pan-India City Selector:** Quick-select pills for **Delhi, Noida, Mumbai, Kolkata, Bengaluru, Chennai** + full India city search (Open-Meteo Geocoding) + optional browser geolocation.
* **1-Click Household Persona Switcher:**
  * `COMMUTER` — Working Professional (daily commute & office exposure)
  * `FAMILY_KIDS` — Family with Young Children (school & outdoor play safety)
  * `SENIOR` — Senior Citizen (cautious low-exertion & indoor protection)
  * `STUDENT_ATHLETE` — Student / Outdoor Sports (training & outdoor timing)
* **Strict AQI Scale Toggle:** `IN_CPCB` (Indian National AQI) | `US_EPA` (US AQI). Scales and thresholds are never mixed.
* **Bilingual Toggle:** `EN` (English) | `தமிழ்` (Tamil).
* **Evaluator Demo Presets:** 1-click scenarios (e.g., *"Delhi • Family with Kids"*, *"Mumbai • Daily Commuter"*, *"Kolkata • Senior Citizen"*) for instant judge testing.

### Screen 1: Live Air, 24h Safe Window & Daily Planner (`/`)
* **Hero AQI Card:** Live AQI value, active scale badge, category pill, dominant pollutant, data source attribution, observation timestamp, and `FRESH` / `STALE` / `UNAVAILABLE` status.
* **24-Hour Safe Window Strip:** Color-coded hourly timeline highlighting **Best Window to Ventilate**, **Best Window for Outdoor Errands**, and **Peak Smog Window**.
* **Morning / Afternoon / Evening Persona Planner:** 3 actionable cards directly below the strip adapting dynamically to both hourly PM2.5 and the active Household Persona.
* **Multi-Pollutant Grid:** PM2.5, PM10, O₃, NO₂, SO₂, and CO with units (`µg/m³` / `mg/m³`).
* **Honest Fallback Controls:** Clear stale/unavailable banners + subtle footer toggle (`Simulate Stale Data`) for live demo proof.

### Screen 2: Multimodal "Room & Smog Scan" (`/room-scan`)
* **Photo Upload + One-Click Samples:** Upload a room/sky photo (`<= 4 MB`, client-resized) or click 3 preloaded sample images (*Urban Kitchen Stove*, *Bedroom Purifier Setup*, *Winter Morning Smog*).
* **Gemini Vision Audit:** Identifies visible airflow, smoke, dust, and filtration factors and returns prioritized findings (`FREE` / `LOW_COST` / `EQUIPMENT`), mechanism explanations, and a quick checklist.
* **Sensor Boundary Notice:** Always states visual analysis is qualitative guidance and direct indoor monitoring requires a physical indoor sensor.

### Screen 3: Interactive "What-If" Impact Simulator (`/simulator`)
* **Persona-Aware Routine Swaps:** Clickable daily toggles (pre-selected defaults adapt to active Household Persona) covering errand timing, Metro/Bus commute, carpooling, trip consolidation, and kitchen exhaust + wet-mopping.
* **Dual Live Impact Meters:** Strictly separates **Personal Exposure Shift** (qualitative tier) from **Emissions Impact** (deterministic min–max `kg CO2e/day` range).
* **"Show Math & Assumptions" Drawer:** Expandable accordion (`aria-expanded`) exposing exact formula, emission factor ranges, active inputs, and uncertainty notes.

### Screen 4: Grounded Bilingual AI Consultant (`/assistant`)
* **Context-Injected Q&A:** Automatically injects active City, Household Persona, verified `AirQualitySnapshot`, `SafeWindowSummary`, and Simulator state into Gemini so it never hallucinates live data.
* **Justification & Transparency:** Every answer explains *why* an action is recommended, tags provenance (`Observed/Modeled`, `24h Forecast`, `Deterministic Estimate`, `AI Guidance`), and supports saving actions to a checklist.

---

## 4. System Architecture & Tech Stack

| Layer | Technology | Responsibilities |
| :--- | :--- | :--- |
| **IDE / Build Tool** | Google Antigravity + Google Stitch | UI design system, agentic build workflow (`SKILL.md`). |
| **Frontend** | Next.js (App Router), React, TypeScript (strict), Tailwind CSS, `lucide-react` | WCAG AA accessible 4-screen UI, Persona/City/Scale context, timeline strip, image upload. |
| **Backend & Guardrails** | Next.js Route Handlers (`src/app/api/*`) | Server-side secret protection, Zod validation, `15s` timeouts, rate limiting, response caching. |
| **Deterministic Engine** | Pure TypeScript Modules (`src/lib/aqi`, `src/lib/emissions`) | CPCB/US AQI math, freshness checks, 24h safe-window & M/A/E scoring, emissions-range formulas. |
| **Generative & Vision AI** | Google Gemini API (`@google/genai`, server-only) | Multimodal room/smog inspection, grounded explanations, English/Tamil localization. |
| **Air Quality Data** | Open-Meteo Air Quality (`/v1/air-quality`) & Geocoding APIs | Free, real-time pan-India `current` & `hourly` pollutants (`pm2_5`, `pm10`, `ozone`, `nitrogen_dioxide`, `sulphur_dioxide`, `carbon_monoxide`, `us_aqi`). |
| **Auth & Storage** | Firebase Auth + Cloud Firestore (Optional) | Optional sign-in & saved actions (`localStorage` fallback for guests). |
| **Testing & Quality** | Vitest + ESLint + TypeScript strict | Automated unit tests for calculators, planners, and schema validation. |
| **Deployment** | Vercel (+ Firebase) | Live production URL with server-only environment variables. |

---

## 5. Repository Structure

```text
airqua-ai/
├── blueprint.md                         # This document
├── skills.md                            # Source skill specification
├── .agent/skills/airqua-ai/SKILL.md     # Registered Antigravity skill
├── public/
│   └── samples/                         # 3 built-in sample photos for Room Scan
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Shell, 4-tab nav, City/Persona/Scale/Language context
│   │   ├── page.tsx                     # Screen 1: Dashboard + 24h Safe Window + M/A/E Planner
│   │   ├── room-scan/page.tsx           # Screen 2: Multimodal Room & Smog Scan
│   │   ├── simulator/page.tsx           # Screen 3: Persona-Aware "What-If" Simulator
│   │   ├── assistant/page.tsx           # Screen 4: Grounded Bilingual AI Consultant
│   │   └── api/
│   │       ├── geocode/route.ts         # Pan-India city search (24h cache)
│   │       ├── air-quality/route.ts     # Provider adapter + CPCB/US scoring + 24h/MAE windows (15m cache)
│   │       ├── room-scan/route.ts       # Gemini Vision structured JSON audit
│   │       ├── simulate/route.ts        # Deterministic exposure & emissions engine
│   │       ├── chat/route.ts            # Context-grounded EN/TA Gemini consultant
│   │       └── actions/route.ts         # Optional Firebase-verified saved actions CRUD
│   ├── components/
│   │   ├── dashboard/                   # AqiHeroCard, SafeWindowStrip, DailyPeriodPlanner, PollutantGrid, StaleDataBanner
│   │   ├── scan/                        # ImageUploader, SamplePhotoPicker, RoomActionCard
│   │   ├── simulator/                   # RoutineToggleList, DualImpactMeters, MathAssumptionsDrawer
│   │   ├── chat/                        # GroundedChatPanel, ProvenanceBadge
│   │   └── shared/                      # CitySelector, PersonaSwitcher, EvaluatorPresets, ScaleToggle, LanguageToggle
│   ├── lib/
│   │   ├── aqi/                         # adapter.ts, openMeteoProvider.ts, cpcbCalculator.ts, usAqiMapper.ts, safeWindowEngine.ts
│   │   ├── emissions/                   # factors.ts, simulatorEngine.ts
│   │   ├── gemini/                      # client.ts, prompts.ts, schemas.ts
│   │   ├── firebase/                    # client.ts, admin.ts
│   │   └── security/                    # rateLimit.ts
│   └── types/
│       └── airqua.ts                    # Shared TypeScript interfaces
├── tests/
│   ├── cpcbCalculator.test.ts
│   ├── safeWindowEngine.test.ts
│   └── simulatorEngine.test.ts
├── firestore.rules
└── .env.local.example
```

---

## 6. Core Data Contracts (`src/types/airqua.ts`)

```ts
export type AqiScale = 'IN_CPCB' | 'US_EPA';
export type DataFreshness = 'FRESH' | 'STALE' | 'UNAVAILABLE';
export type DataKind = 'OBSERVED' | 'FORECAST' | 'ESTIMATE' | 'AI_EXPLANATION';
export type SupportedLanguage = 'en' | 'ta';
export type HouseholdPersona = 'COMMUTER' | 'FAMILY_KIDS' | 'SENIOR' | 'STUDENT_ATHLETE';

export interface PollutantReading {
  code: 'PM2_5' | 'PM10' | 'O3' | 'NO2' | 'SO2' | 'CO';
  label: string;
  value: number | null;
  unit: 'µg/m³' | 'mg/m³';
}

export interface AirQualitySnapshot {
  location: {
    name: string;
    region?: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  };
  provider: string;
  dataKind: 'OBSERVED' | 'FORECAST';
  observedAt: string | null;
  fetchedAt: string;
  freshness: DataFreshness;
  scale: AqiScale;
  aqiValue: number | null;
  aqiCategory: string;
  dominantPollutant: PollutantReading['code'] | null;
  pollutants: PollutantReading[];
  disclaimer: string;
}

export interface SafeWindowSlot {
  hourISO: string;
  pm25: number | null;
  pm10: number | null;
  aqiEstimate: number | null;
  ventilationStatus: 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
  outdoorStatus: 'BEST' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
}

export interface DayPeriodPlan {
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  timeRange: string;
  avgPm25: number | null;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
  headline: string;
  personaAction: string;
  whyItMatters: string;
}

export interface SafeWindowSummary {
  bestVentilationWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  bestOutdoorWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  peakSmogWindow: { startISO: string; endISO: string; avgPm25: number } | null;
  dailyPeriods: DayPeriodPlan[];
  hourlySlots: SafeWindowSlot[];
  dataKind: 'FORECAST';
}

export interface RoomScanResult {
  sceneType: 'KITCHEN' | 'BEDROOM' | 'LIVING_AREA' | 'OUTDOOR_SKY' | 'OTHER';
  confidenceNote: string;
  findings: Array<{
    item: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    mechanism: string;
    practicalFix: string;
    estimatedCost: 'FREE' | 'LOW_COST' | 'EQUIPMENT';
  }>;
  quickChecklist: string[];
  sensorBoundaryNotice: string;
  dataKind: 'AI_EXPLANATION';
}

export interface ImpactSimulationResult {
  personalExposure: {
    direction: 'LIKELY_LOWER' | 'NEUTRAL' | 'UNCERTAIN';
    summary: string;
    mechanism: string;
    limitation: string;
  };
  emissionsImpact: {
    co2eMinKg: number;
    co2eMaxKg: number;
    unit: 'kg CO2e/day';
    methodVersion: string;
    formula: string;
    assumptions: string[];
    uncertaintyNote: string;
  };
  dataKind: 'ESTIMATE';
}
```

---

## 7. Deterministic Calculation & Accessibility Specifications

### 7.1 Strict AQI Scale Separation (`IN_CPCB` vs. `US_EPA`)

| Indian CPCB AQI (`IN_CPCB`) | CPCB Category | US EPA AQI (`US_EPA`) | US EPA Category |
| :--- | :--- | :--- | :--- |
| `0–50` | Good | `0–50` | Good |
| `51–100` | Satisfactory | `51–100` | Moderate |
| `101–200` | Moderate | `101–150` | Unhealthy for Sensitive Groups |
| `201–300` | Poor | `151–200` | Unhealthy |
| `301–400` | Very Poor | `201–300` | Very Unhealthy |
| `401–500` | Severe | `301–500` | Hazardous |

* **CPCB Sub-Index Formula:** `I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo`; overall `IN_CPCB` AQI = `max(I_p)` across available pollutants (disclosing clearly when derived from hourly modeled readings rather than 24-hour regulatory station averages).
* **Freshness Thresholds:** `< 60m` = `FRESH` | `60–180m` = `STALE` | `> 180m` or error = `UNAVAILABLE`.

### 7.2 24-Hour Safe Window & Morning / Afternoon / Evening Engine
* Computes a sliding **2-hour rolling average** of hourly `pm2_5` to rank **Best Ventilation Window**, **Best Outdoor Window** (`06:00–20:00`), and **Peak Smog Window**.
* Computes average `pm2_5` across **Morning** (`06:00–11:59`), **Afternoon** (`12:00–17:59`), and **Evening** (`18:00–22:59`) and pairs each period with deterministic guidance tailored to `HouseholdPersona`.

### 7.3 "What-If" Simulator Logic
* **Shift outdoor walk/errand to Best Safe Window:** Evaluates hourly `pm2_5` reduction ratio → updates **Personal Exposure** only (`0.0 kg CO2e`).
* **Solo Car → Metro / Bus (`distanceKm`):** Petrol car (`0.15–0.21 kg/km`) minus transit (`0.03–0.06 kg/km`) × `distanceKm`.
* **Carpool (`distanceKm`, `occupancy` 2–3):** Divides per-passenger vehicle factor by occupancy (`50%–66%` range reduction).
* **Consolidate 2 short errands (`savedKm`):** Avoided short-trip factor (`0.17–0.24 kg/km`) × `savedKm`.
* **Kitchen Exhaust + Wet-Mopping:** Updates qualitative indoor **Personal Exposure** guidance (`0.0 kg CO2e`; explicitly states not sensor-verified).

### 7.4 WCAG AA Accessibility Standards
* Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
* Explicit `aria-label` on all icon buttons and toggles, `aria-pressed` on persona/scale/language pills, `aria-expanded` on drawers.
* `aria-live="polite"` regions for live AQI updates and streaming/loaded AI chat responses.
* Visible keyboard focus rings and ≥ 4.5:1 text contrast on all AQI and status badges.

---

## 8. API Endpoints & Security

| Route | Method | Validation & Guardrails |
| :--- | :--- | :--- |
| `/api/geocode` | `GET` | Query `q` (`2–60` chars); cached `24h`. |
| `/api/air-quality` | `GET` | Validates `lat`, `lon`, `scale`, `persona`, optional `simulateStale=true`; cached `15m`; returns `{ snapshot, safeWindows }`. |
| `/api/room-scan` | `POST` | Validates MIME (`jpeg/png/webp`), size (`<= 4 MB`), `persona`, `language`; `15s` timeout; Zod-validates Gemini JSON output. |
| `/api/simulate` | `POST` | Validates toggle IDs, `distanceKm`, `occupancy`, `persona`; deterministic math only. |
| `/api/chat` | `POST` | Validates `message` (`<= 800` chars) & last 6 turns; injects active `persona`, `snapshot`, `safeWindows`; rate-limited. |
| `/api/actions` | `GET/POST/PATCH` | Verifies Firebase ID token server-side when configured; enforces strict `users/{uid}/actions` isolation. |

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /airReadings/{readingId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 9. Build Milestones & Quality Gate

1. **Milestone 1 — Deterministic Core & Tests:** Register `.agent/skills/airqua-ai/SKILL.md`, scaffold Next.js + Tailwind + TypeScript, implement `openMeteoProvider`, `cpcbCalculator`, `usAqiMapper`, `safeWindowEngine`, `simulatorEngine`, and `vitest` unit tests.
2. **Milestone 2 — Accessible Shell & Dashboard (`/`):** Build pan-India city selector, Household Persona switcher, Evaluator Presets, Hero AQI card, 24h Safe Window strip, Morning/Afternoon/Evening planner, and stale-data demo toggle.
3. **Milestone 3 — Multimodal Room Scan (`/room-scan`):** Build `/api/room-scan` with Gemini Vision structured JSON output, client image compression, and 3 one-click sample room photos.
4. **Milestone 4 — Simulator & Bilingual Chat (`/simulator`, `/assistant`):** Build Persona-aware Dual Impact Meters + Math Drawer, grounded English/Tamil Gemini chat, and Guest-first/Firebase saved actions.
5. **Milestone 5 — Audit, Evaluator README & Deploy:** Pass `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`; generate `README.md` with **"Sample Inputs for Evaluators"** at the top; deploy to Vercel.

---

## 10. PromptWars Submission Checklist (4 Mandatory Deliverables)

1. **Live Deployed URL** (Vercel — verified working in Guest Mode).
2. **Public GitHub Repository** (with **"Sample Inputs for Evaluators"** at the top of `README.md`).
3. **Screen-Recording Demo Video** (2–3 minutes proving all 4 screens, Persona switching, Room Scan, Simulator Math Drawer, Tamil chat, and Stale Data fallback work live).
4. **Mandatory LinkedIn Post** explicitly covering:
   * Tools used & why they were selected (Google Stitch, Google Antigravity, Gemini API, Open-Meteo, Next.js).
   * System architecture & prompt flow.
   * How prompts evolved across iterations.
   * What GenAI handled vs. what you engineered deterministically yourself.
* **Attempt Rule:** Only the **final** submission attempt score counts (out of 3 attempts)—verify all 6 grading signals before submitting.
