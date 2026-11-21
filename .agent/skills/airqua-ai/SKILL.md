---
name: airqua-ai-builder
description: Engineering blueprint, scientific guardrails, Household Persona personalization, WCAG AA accessibility standards, deterministic calculation boundaries, and Gemini Vision/Chat schemas for AIRQUA AI (PromptWars Challenge 6).
---

# AIRQUA AI — Engineering & Domain Skill (v2)

## 1. Product Identity & PromptWars Evaluation Priorities
AIRQUA AI is a guest-first, multimodal urban air-quality and sustainable living assistant for Indian families and communities (PromptWars Challenge 6).

Optimize every file, API route, and UI component for the **6 automated PromptWars grading signals** plus human prototype evaluation:
1. **Code Quality:** Modular TypeScript (strict mode), clean separation of concerns, zero dead code or unused imports.
2. **Security:** Server-only API keys, Zod input/output validation, rate limiting, strict image MIME/size checks (`<= 4 MB`), `15s` timeouts, no XSS or client-side secret leaks.
3. **Efficiency:** Server-side response caching (`15m` for AQI, `24h` for geocoding), client-side image compression before upload, minimal re-renders.
4. **Testing:** Comprehensive `vitest` unit tests covering CPCB/US scale math, freshness states, 24h Safe Window + Morning/Afternoon/Evening persona logic, and emissions-range calculations.
5. **Accessibility (WCAG AA):** Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), `aria-label` on all icon/toggle buttons, `aria-pressed` on active pills, `aria-expanded` on drawers, `aria-live="polite"` on dynamic AQI and chat regions, visible keyboard focus rings, and ≥ 4.5:1 text contrast.
6. **Problem Statement Alignment:** Real-time pan-India data, Household Persona adaptation, Morning/Afternoon/Evening daily planner, indoor air hacks, and justified sustainable alternatives.

---

## 2. Non-Negotiable Scientific & Safety Guardrails

1. **Real-Time Pan-India Data Only (Zero Fabricated AQI):**
   - Fetch live `current` and `hourly` pollutant data from Open-Meteo Air Quality API (`/v1/air-quality?timezone=auto&forecast_days=2`).
   - Support all Indian cities via Open-Meteo Geocoding API + optional browser geolocation + 6 quick-select pills (`Delhi`, `Noida`, `Mumbai`, `Kolkata`, `Bengaluru`, `Chennai`).
   - NEVER rely on Gemini to generate or guess AQI values.
   - Enforce freshness states: `< 60m` = `FRESH`, `60–180m` = `STALE`, `> 180m` or error = `UNAVAILABLE`. Always render explicit stale/unavailable UI states rather than inventing numbers.

2. **Strict AQI Scale Separation:**
   - Support `IN_CPCB` (Good `0–50`, Satisfactory `51–100`, Moderate `101–200`, Poor `201–300`, Very Poor `301–400`, Severe `401–500`) and `US_EPA` (Good `0–50`, Moderate `51–100`, Unhealthy for Sensitive Groups `101–150`, Unhealthy `151–200`, Very Unhealthy `201–300`, Hazardous `301–500`) independently.
   - NEVER relabel a US AQI score with Indian CPCB categories or mix thresholds.
   - Display `provider`, `scale`, `observedAt`, `fetchedAt`, and pollutant `unit` (`µg/m³` / `mg/m³`) on every reading.

3. **Household Persona Personalization:**
   - Maintain 4 global personas: `COMMUTER`, `FAMILY_KIDS`, `SENIOR`, `STUDENT_ATHLETE`.
   - Two users in the same city with different personas MUST receive visibly different Morning/Afternoon/Evening actions, Simulator default toggles, and Gemini Chat recommendations.

4. **Deterministic Math vs. Generative AI Boundary:**
   - Use pure TypeScript functions (NOT Gemini) for CPCB sub-index breakpoint math, US EPA category mapping, 24h Safe Window & Morning/Afternoon/Evening ranking, emissions-range calculations, and authorization.
   - Use Gemini (`@google/genai`, server-only in `src/lib/gemini/client.ts`) ONLY for Room/Smog visual inspection, plain-language justification, personalization, and English/Tamil translation.

5. **Exposure vs. Emissions Separation:**
   - NEVER conflate personal exposure reduction with emissions reduction.
   - Display **Personal Exposure Shift** (qualitative tier) and **Emissions Impact** (`kg CO2e/day` min–max range) in separate UI cards.
   - NEVER claim exact CO₂ savings; always provide an expandable **"Show Math & Assumptions"** drawer disclosing formula, emission factor ranges, active inputs, and uncertainty.

6. **Medical, Indoor Sensor & Guest-First Boundaries:**
   - NEVER diagnose medical conditions, prescribe treatments, or guarantee any outdoor activity is safe; direct vulnerable groups to official health guidance.
   - Explicitly state in Dashboard and Room Scan views that outdoor AQI and photos are NOT direct indoor air measurements (direct monitoring requires a physical indoor sensor).
   - Zero login wall: default to Guest Mode (`localStorage` for saved actions) on live Delhi data. Keep Firebase Auth + Firestore optional.

---

## 3. Tech Stack & 4-Screen Architecture

- **Framework:** Next.js (App Router), React, TypeScript (strict), Tailwind CSS, `lucide-react`.
- **AI & Validation:** `@google/genai` (server-only), `zod` (all API inputs/outputs & Gemini JSON parsing).
- **Testing:** `vitest` (`tests/`).
- **Navigation (4 Primary Screens):**
  1. `/` — Live Dashboard + 24h Safe Window Strip + Morning/Afternoon/Evening Persona Planner
  2. `/room-scan` — Multimodal Room & Smog Scan (Gemini Vision)
  3. `/simulator` — Interactive Persona-Aware "What-If" Impact Simulator
  4. `/assistant` — Grounded Bilingual (EN / தமிழ்) AI Consultant

---

## 4. Exact Gemini System Prompts

### A. Room & Smog Scan (`/api/room-scan`)
Call Gemini multimodal with `responseMimeType: "application/json"` and validate the response against `RoomScanResultSchema`:

```text
You are AIRQUA AI's indoor & outdoor visual air-quality advisor for Indian households.
Analyze the uploaded photo of a room, kitchen, window, air purifier setup, or outdoor sky, tailored to the user's active Household Persona (`COMMUTER`, `FAMILY_KIDS`, `SENIOR`, `STUDENT_ATHLETE`).
Rules:
1. Identify ONLY clearly visible airflow, smoke, dust, ventilation, or filtration factors (e.g., gas stove without visible exhaust, air purifier blocked in a corner, unsealed window gaps, incense/dhoop smoke, dry sweeping dust, dense outdoor haze).
2. Recommend practical, prioritized fixes (`FREE`, `LOW_COST`, `EQUIPMENT`) suited to urban Indian homes (exhaust fan timing during tadka/frying, wet mopping over dry sweeping, purifier clearance/CADR sizing, cross-ventilation windows).
3. Distinguish particle pollution (PM2.5/PM10) from gases/VOCs; never claim one filter or houseplant removes all pollutants.
4. NEVER estimate exact indoor AQI or PM2.5 numbers from a photo.
5. Always include a clear `sensorBoundaryNotice` stating that visual analysis is qualitative guidance and direct indoor measurement requires a physical indoor sensor.
6. Respond in the requested language (`en` or `ta`), preserving standard technical terms (PM2.5, HEPA, CPCB AQI).
Return strictly valid JSON matching the requested schema.
```

### B. Grounded Bilingual Consultant (`/api/chat`)
Inject the active `HouseholdPersona`, `AirQualitySnapshot`, and `SafeWindowSummary` JSON into the prompt before user messages:

```text
You are AIRQUA AI, a scientifically honest urban air-quality and sustainable living assistant.
You receive a JSON payload containing the user's ACTIVE HOUSEHOLD PERSONA and CURRENT VERIFIED AIR QUALITY CONTEXT.
Rules:
1. Ground every numeric reference strictly in the provided JSON. If a value is null, stale, or unavailable, state that explicitly — NEVER invent AQI or pollutant numbers.
2. Always state the active AQI scale (`IN_CPCB` or `US_EPA`) and observation timestamp when citing AQI.
3. Tailor every recommendation directly to the active Household Persona (`COMMUTER`, `FAMILY_KIDS`, `SENIOR`, or `STUDENT_ATHLETE`).
4. Always justify WHY each recommendation is made, separate personal exposure reduction from emissions reduction, and note practical limitations.
5. NEVER diagnose medical conditions or guarantee an activity is safe; advise sensitive groups to follow official health guidance.
6. Support both English (`en`) and Tamil (`ta`). In Tamil responses, use natural everyday Tamil while keeping standard technical terms (`PM2.5`, `HEPA`, `CPCB AQI`) clear.
7. Keep responses concise, scannable, and practical (short bullets + actionable steps).
```

---

## 5. Evaluator & Demo Helpers
- **Evaluator Presets:** Provide 1-click presets in the header (e.g., *Delhi • Family with Kids*, *Mumbai • Daily Commuter*, *Kolkata • Senior Citizen*).
- **Sample Room Photos:** Include 3 built-in sample images in `public/samples/` (*Urban Kitchen Stove*, *Bedroom Purifier Setup*, *Winter Morning Smog*) for 1-click Gemini Vision testing.
- **Stale Data Demo Toggle:** Include a subtle `"Simulate Stale Data"` toggle in the footer to demonstrate honest fallback behavior during live evaluation.
- **Provenance Badges:** Tag data surfaces clearly as `Observed / Modeled`, `24h Forecast`, `Deterministic Estimate`, or `AI Guidance`.
- **Evaluator README:** Place a **"Sample Inputs for Evaluators"** section at the top of `README.md`.

---

## 6. Mandatory Verification Gate
Before completing any milestone or final build, run and pass all four commands with zero errors:
1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test`
4. `npm run build`
