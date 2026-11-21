# AIRQUA AI — Urban Air Quality & Persona Intelligence

> **PromptWars Challenge 6:** A guest-first, multimodal urban air-quality and sustainable living assistant tailored for Indian families and communities.

---

## ⚡ Sample Inputs for Evaluators

Test every capability of AIRQUA AI in 1 click without setup or sign-in:

### 1. 1-Click Scenario Presets (Header Dropdown)
* **Preset 1 (Delhi • Family with Kids):** High-smog winter scenario in the National Capital Region. See how Morning school commute guidance differs from Afternoon indoor playtime, and verify kitchen ventilation hacks.
* **Preset 2 (Mumbai • Daily Commuter):** Coastal urban scenario. Test how switching from solo car to the Mumbai Metro or Western Line carpool calculates deterministic carbon reductions.
* **Preset 3 (Kolkata • Senior Citizen):** High-particulate caution scenario tailored for low-exertion routines and avoiding morning thermal inversion hours.
* **Preset 4 (Bengaluru • Student Athlete):** Dynamic training scenario highlighting clean afternoon outdoor workout windows.

### 2. Pan-India City Coverage & Quick Pills
* **6 Instant Pills:** Click `Delhi`, `Noida`, `Mumbai`, `Kolkata`, `Bengaluru`, or `Chennai` in the global header for real-time live Copernicus CAMS & GFS telemetry.
* **Pan-India Search:** Type any Indian tier-1/tier-2/tier-3 city (e.g., `Madurai`, `Lucknow`, `Pune`, `Ahmedabad`, `Jaipur`, `Coimbatore`) into the search bar.
* **Browser Geolocation:** Click **"My Location"** (`LocateFixed` icon) to sync with your current GPS coordinates.

### 3. Screen 2: 1-Click Multimodal Room & Smog Scan (`/room-scan`)
Evaluators can test Gemini 2.5 Flash Multimodal Vision in 1 click without uploading photos:
* **Sample 1 ("Urban Kitchen Stove"):** Tests oil aerosolization, high-heat tadka emissions, and kitchen exhaust fan timing recommendations.
* **Sample 2 ("Bedroom Purifier Setup"):** Tests CADR intake clearance, wall proximity traps, and room air delivery.
* **Sample 3 ("Winter Morning Smog"):** Tests outdoor particulate haze vs. balcony window sealing gaps.
* *Notice:* Every scan prominently displays the non-negotiable **Sensor Boundary Notice** (*"Visual analysis is qualitative guidance; direct indoor monitoring requires a physical indoor sensor"*).

### 4. Screen 3: "What-If" Routine Simulator (`/simulator`)
* **Strict Exposure vs. Emissions Separation:**
  * Toggle *"Shift Outdoor Walk to Safe Window"* → Updates **Card A (Personal Exposure Shift)** to `Likely Lower`, while keeping **Card B (Emissions Impact)** strictly at `0.00 kg CO2e/day`.
  * Toggle *"Solo Car → Metro / Transit"* → Computes deterministic `[1.80 – 3.60] kg CO2e/day` range with zero LLM guesswork.
* **Show Math & Assumptions Drawer:** Expand the accordion to inspect the exact computational formula and ARAI/CEA baseline emission factors.

### 5. Screen 4: Grounded Bilingual AI Consultant (`/assistant`)
* **1-Click Quick Prompts:**
  * *"What should I change today?"* (Evaluates live city AQI + active persona).
  * *"How do I reduce cooking smoke?"* (Practical Indian household ventilation).
  * *"Why are you recommending this?"* (Exposes scientific mechanism and data provenance).
  * *"தமிழில் விளக்குங்கள்"* (Seamless Tamil response preserving standard terms like PM2.5, HEPA, and CPCB AQI).
* **Save Action to Routine:** Click the bookmark icon on any assistant recommendation to save it to your daily checklist.

### 6. Honest Fallback Proof: "Simulate Stale Data" Toggle (Footer)
* Check the **"Simulate Stale Data (Demo Mode)"** box in the footer to demonstrate transparent resilience: the UI cleanly displays yellow/amber stale telemetry banners (`STALE >60m`) rather than inventing numbers.

---

## 🏗️ 4-Screen Workflow

| Screen | Route | Key Capabilities |
| :--- | :--- | :--- |
| **1. Observe** | `/` | Live AQI hero card, 24-hour safe window strip (best ventilation, best outdoor, peak smog), 3-card Morning/Afternoon/Evening persona planner, multi-pollutant grid. |
| **2. Scan** | `/room-scan` | Gemini 2.5 Flash multimodal vision inspection, client-side `<canvas>` image compression (`<= 4 MB`), 3 one-click sample photos, prioritized risk & cost fixes (`FREE`, `LOW_COST`, `EQUIPMENT`). |
| **3. Simulate** | `/simulator` | Interactive "What-If" routine swaps, strict separation of Personal Exposure Shift from Emissions Impact (`kg CO2e/day` min–max range), expandable math & assumptions drawer. |
| **4. Act** | `/assistant` | Grounded bilingual (EN / தமிழ்) Gemini consultant, live context chips, 1-click quick prompts, data provenance badges (`Observed`, `Forecast`, `Estimate`, `AI Guidance`), persistent saved checklist. |

---

## 🔬 Deterministic Math vs. Generative AI Boundary

To prevent AI hallucination of regulatory environmental metrics, AIRQUA AI maintains a strict boundary:

```
┌────────────────────────────────────────────────────────┐
│             DETERMINISTIC TS ENGINE (Pure Math)        │
│  - Indian CPCB AQI Sub-Index Breakpoint Formulas       │
│  - US EPA AQI Categories & Strict Scale Separation     │
│  - 2-Hour Rolling Average Safe Window Computation      │
│  - Morning / Afternoon / Evening Persona Scoring       │
│  - ARAI/CEA Vehicle Emissions Min-Max Ranges           │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ Context Injected
┌────────────────────────────────────────────────────────┐
│             GENERATIVE & MULTIMODAL AI (Gemini)        │
│  - Multimodal Room & Smog Inspection (Gemini 2.5 Flash)│
│  - Plain-Language Justifications ("Why It Matters")    │
│  - Household Persona Localization & Empathetic Tone    │
│  - Bilingual Translation (English & Tamil)             │
│  - Zero Fabricated AQI, Pollutants, or Carbon Math     │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Guardrails

1. **Server-Only API Keys:** `GEMINI_API_KEY` and `GROQ_API_KEY` are loaded exclusively inside Node.js Route Handlers (`src/app/api/`) and protected by server-side runtime guards throwing fatal errors if ever referenced on the client.
2. **Automatic AI Failover Router:** When Google Gemini reaches daily free-tier rate limits (`429` / `RESOURCE_EXHAUSTED` / timeouts), the server automatically fails over to Groq (`openai/gpt-oss-120b` for chat, `qwen/qwen3.8-27b` for vision) with strict Zod validation and a visible provider status pill.
3. **Groq Whisper & Orpheus Voice Engine:** `/api/voice/transcribe` uses Groq Whisper (`whisper-large-v3-turbo`) for accurate Indian English & Tamil voice recognition, while `/api/voice/speak` streams neural audio with graceful browser `SpeechSynthesis` fallbacks.
4. **Strict Scale Integrity:** Indian CPCB AQI (`0–500`) and US EPA AQI (`0–500`) are never mixed, relabeled, or averaged together.
5. **Medical & Sensor Boundaries:** The system explicitly states that outdoor AQI and photos are not direct indoor measurements and provides educational guidance rather than medical diagnoses.
6. **Rate Limiting & Size Caps:** All API routes enforce sliding-window rate limiting (10–25 req/min per IP) and strict payload size checks (`<= 4 MB` for images, `<= 10 MB` for audio).
7. **Zero Login Wall:** Fully functional in Guest Mode (`localStorage` for preferences and saved actions) with optional Firebase Auth support.

---

## ♿ WCAG AA Accessibility Standards

- **Semantic Landmarks:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<article>`.
- **ARIA Attributes:** `aria-live="polite"` on dynamic AQI cards and chat streams, `aria-pressed` on toggles/pills, `aria-expanded` on drawers, `aria-checked` on switches.
- **Keyboard Navigation:** Full tab order with visible primary focus rings (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).
- **High Contrast:** All category badges and text meet or exceed 4.5:1 contrast ratios.

---

## 🧪 Quality Gate Verification

AIRQUA AI passes all 4 mandatory quality gates:

```bash
# 1. TypeScript Strict Typecheck (0 errors)
npx tsc --noEmit

# 2. ESLint (0 errors, 0 warnings)
npm run lint

# 3. Vitest Unit Test Suite (53/53 tests passing across 11 suites)
npm test

# 4. Next.js Production Build
npm run build
```

---

## 🚀 Local Setup & Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.local.example .env.local
# Add your GEMINI_API_KEY in .env.local

# 3. Start development server
npm run dev
# Open http://localhost:3000
```

### Production Deployment (Vercel)
1. Push the repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the following Environment Variable in Vercel Project Settings:
   - `GEMINI_API_KEY` = your Google AI Studio API key.
   - *(Optional)* `NEXT_PUBLIC_FIREBASE_*` variables if enabling Firebase cloud sync.
4. Deploy! The application will build cleanly with `next build`.
