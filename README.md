**Understand the air. Make informed choices. Build cleaner communities.**

*A guest-first, multimodal environmental decision-support platform built for **PromptWars | Challenge 6**.*

## 🎯 Why AIRQUA AI?

Most air-quality apps stop at a red AQI number and a generic warning. During severe Indian winter smog, households need **timing, indoor fixes, persona-specific routines, and honest math**—not just another ticker.

| Urban Pollution Gap | How AIRQUA AI Solves It | 
| ----- | ----- | 
| **Raw AQI without actionable timing** | Animated Radial AQI Gauge + live **Wind Dispersion** telemetry + interactive **24-Hour Safe Window Area Chart** pinpointing exact ventilation & errand hours. | 
| **Confusing CPCB vs. US EPA scales** | Dedicated deterministic calculators (`IN_CPCB` and `US_EPA`) with strict separation—thresholds and category labels are **never** blended. | 
| **Generic, one-size-fits-all advice** | 1-Click **Household Persona Switcher** (`Commuter`, `Family with Kids`, `Senior Citizen`, `Student Athlete`) adapting all 4 screens dynamically. | 
| **Hidden indoor pollution sources** | **Multimodal Room & Smog Scan** (Gemini 2.5 Flash + Groq Vision failover) auditing kitchens, purifiers, and windows for Free/Low-Cost fixes. | 
| **Blurred exposure vs. CO₂ claims** | **What-If Simulator** strictly separates Personal Exposure Shift from WRI India $\text{CO}_2\text{e}$ ranges with an expandable **"Show Math & Assumptions"** drawer. | 
| **Language barriers & API fragility** | Grounded **English & Tamil** Voice AI Consultant (Groq Whisper STT + Orpheus/Web Speech TTS), automatic Gemini → Groq failover, and honest Stale Data alerts. | 

## ⚡ Sample Inputs for Evaluators

> **Zero Login Wall:** Open [**https://aq-ai.vercel.app/**](https://aq-ai.vercel.app/) to test every feature immediately in Guest Mode (or sign in via Google / Email to test Cloud Firestore sync).

### 1. Live Dashboard & Persona Adaptation (`/`)

* **1-Click Evaluator Presets (Top-Right Demo Tools Popover):**

  * `Delhi • Family with Kids` — High-smog winter scenario; inspect Morning school drop-off vs. Afternoon indoor routines.

  * `Mumbai • Daily Commuter` — Coastal urban scenario; switch personas and watch Morning/Afternoon/Evening cards adapt live.

  * `Kolkata • Senior Citizen` — Cautious low-exertion schedule avoiding morning inversion peaks.

  * `Bengaluru • Student Athlete` — Clean afternoon outdoor training window detection.

* **Pan-India City Search & GPS:** Click the 6 quick pills (`Delhi`, `Noida`, `Mumbai`, `Kolkata`, `Bengaluru`, `Chennai`), type any Indian city (`Erode`, `Madurai`, `Pune`, `Lucknow`, `Jaipur`), or click **My Location** for live OSM Nominatim reverse geocoding.

* **Scale Integrity Check:** Toggle **`IN CPCB`** ↔ **`US EPA`** in the header to verify separate category labels and breakpoints.

### 2. Multimodal Room & Smog Scan (`/room-scan`)

Test Gemini 2.5 Flash Vision (with Groq Vision backup) in 1 click using built-in samples—no file upload required:

* **Sample 1 (`Urban Kitchen Stove`):** Flags high-heat *tadka*/frying smoke, exhaust timing, and free ventilation fixes.

* **Sample 2 (`Bedroom Purifier Setup`):** Flags CADR intake clearance and wall-proximity airflow traps.

* **Sample 3 (`Winter Morning Smog`):** Evaluates outdoor particulate haze and window-sealing guidance.

* *Guardrail Check:* Every scan displays the mandatory **Sensor Boundary Notice** (*visual analysis is qualitative guidance; direct indoor measurement requires a physical sensor*).

### 3. Deterministic "What-If" Impact Simulator (`/simulator`)

* **Exposure-Only Check:** Toggle *"Shift Outdoor Walk to Safe Window"* → **Card A (Personal Exposure)** updates to `Likely Lower` while **Card B (Emissions)** stays strictly at `0.00 kg CO2e`.

* **Emissions Math Check:** Select **`Mid-size Sedan Petrol`**, drag distance slider to **`16 km`**, toggle *"Solo Car → Metro/Bus"*, switch horizon to **`Monthly (22 days)`**, and expand **"Show Math & Assumptions"** to inspect the WRI India formula and range.

### 4. Grounded Bilingual & Voice AI Consultant (`/assistant`)

* **Live Prompt 1 (EN):** `"Should I jog at 7 AM today?"` → Returns structured card grounded in live city AQI, wind dispersion, and Safe Windows.

* **Live Prompt 2 (தமிழ்):** Click **`தமிழில் விளக்குங்கள்`** → Returns natural Tamil guidance preserving technical terms (`PM2.5`, `HEPA`, `CPCB AQI`).

* **Voice & Cross-Screen Plan:** Click the **Mic** button (Groq Whisper STT), click **Listen** on a reply (Groq Orpheus / Browser TTS), bookmark an action, and open **`My Plan`** in the header.

* **Honest Fallback Check:** Open **Demo Tools** (top-right) → enable **`Simulate Stale Data`** to verify transparent amber `STALE (>60m)` banners with zero fabricated readings.

## 📱 The 4-Screen Workflow

```
  [ 1. OBSERVE ]  ──────▶  [ 2. SCAN ]  ──────▶  [ 3. SIMULATE ]  ──────▶  [ 4. ACT ]
  Live Dashboard           Room & Smog           What-If Impact           Voice AI Consultant
  CPCB/US + Weather        Gemini/Groq Vision    Exposure vs. CO2e        EN/Tamil + My Plan

```

## 🏗️ Hybrid System Architecture

To eliminate LLM hallucinations on regulatory or environmental metrics, AIRQUA AI enforces a **hard boundary** between pure deterministic TypeScript math and server-side Generative AI.

```
flowchart LR
    subgraph EXT["🌐 Free Keyless Data APIs"]
        direction TB
        A1["Open-Meteo Air Quality<br/>(Copernicus CAMS)"]
        A2["Open-Meteo Weather<br/>(Temp, Humidity, Wind)"]
        A3["Open-Meteo Geocoding<br/>+ OSM Nominatim GPS"]
    end

    subgraph DET["⚙️ Deterministic TS Engine (0% LLM)"]
        direction TB
        D1["Indian CPCB Sub-Index Math<br/>& US EPA Strict Mapper"]
        D2["Freshness Engine &<br/>Wind Dispersion Status"]
        D3["2h Rolling Safe Windows<br/>& M/A/E Persona Planner"]
        D4["WRI India / Shakti<br/>Emissions Range Engine"]
    end

    subgraph AI["🧠 Server-Only GenAI + Auto-Failover"]
        direction TB
        G1["Primary: Gemini 2.5 Flash<br/>(Vision + Structured Chat)"]
        G2["Backup: Groq Auto-Failover<br/>(Qwen 3.8 Vision / GPT-OSS)"]
        G3["Voice: Groq Whisper STT<br/>& Orpheus / Browser TTS"]
    end

    subgraph UI["📱 4-Screen WCAG AA App"]
        direction TB
        U1["Dashboard • Room Scan<br/>Simulator • Consultant"]
        U2["My Plan Drawer &<br/>Toast Notifications"]
    end

    subgraph SYNC["☁️ Guest & Cloud Sync"]
        S1["Guest localStorage<br/>↔ Firebase Auth & Firestore"]
    end

    EXT --> DET
    DET -->|"Verified JSON Context"| AI
    DET --> UI
    AI -->|"Zod-Validated JSON"| UI
    UI <--> SYNC

    style DET fill:#ecfdf5,stroke:#0f766e,stroke-width:2px,color:#0f172a
    style AI fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style SYNC fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#0f172a

```

### Automatic Multi-Provider Failover & Voice Routing

```
sequenceDiagram
    participant Client as Next.js Client (WCAG AA)
    participant Router as Server Provider Router
    participant Gemini as Google Gemini 2.5 Flash
    participant Groq as Groq API (Backup & Voice)

    Client->>Router: POST /api/room-scan or /api/chat (Zod Validated)
    Router->>Gemini: Primary Request (15s Timeout, JSON Mode)
    alt Gemini Succeeds (200 OK)
        Gemini-->>Router: Structured JSON
        Router-->>Client: Zod-Validated Response (aiProvider: "gemini")
    else Rate Limit / Quota / 503 / Timeout
        Gemini--xRouter: 429 RESOURCE_EXHAUSTED
        Router->>Groq: Auto-Failover (qwen3.8-27b / gpt-oss-120b)
        Groq-->>Router: Structured JSON
        Router-->>Client: Zod-Validated Response (aiProvider: "groq-backup")
    end

```

## 🔬 Scientific Guardrails & Math

### 1. Strict AQI Scale Separation (`IN_CPCB` vs. `US_EPA`)

Indian CPCB sub-indices are calculated deterministically using linear breakpoint interpolation:

$$
I_p = \frac{I_{\text{Hi}} - I_{\text{Lo}}}{BP_{\text{Hi}} - BP_{\text{Lo}}} \cdot (C_p - BP_{\text{Lo}}) + I_{\text{Lo}}, \quad \text{AQI}_{\text{CPCB}} = \max(I_p)
$$

| Indian CPCB (`IN_CPCB`) | CPCB Category | CPCB $\text{PM}_{2.5}$ ($\mu\text{g/m}^3$) | US EPA (`US_EPA`) | US EPA Category | 
| ----- | ----- | ----- | ----- | ----- | 
| `0 – 50` | **Good** | `0 – 30` | `0 – 50` | **Good** | 
| `51 – 100` | **Satisfactory** | `31 – 60` | `51 – 100` | **Moderate** | 
| `101 – 200` | **Moderate** | `61 – 90` | `101 – 150` | **Unhealthy for Sensitive Groups** | 
| `201 – 300` | **Poor** | `91 – 120` | `151 – 200` | **Unhealthy** | 
| `301 – 400` | **Very Poor** | `121 – 250` | `201 – 300` | **Very Unhealthy** | 
| `401 – 500` | **Severe** | `250+` | `301 – 500` | **Hazardous** | 

### 2. Operational & Emissions Thresholds

* **Telemetry Freshness:** `< 60m` = `FRESH` · `60–180m` = `STALE` · `> 180m` or error = `UNAVAILABLE` (never invents missing values).

* **Smog Dispersion (10m Wind):** `< 6 km/h` = `STAGNANT` · `6–15 km/h` = `MODERATE` · `> 15 km/h` = `DISPERSING`.

* **India Vehicle Operational Factors (WRI India / Shakti Baselines):**

  * Small Hatchback Petrol: `0.12 – 0.14 kg CO2e/km`

  * Mid-size Sedan Petrol: `0.15 – 0.18 kg CO2e/km`

  * Compact SUV Petrol: `0.17 – 0.20 kg CO2e/km`

  * Two-Wheeler / Scooter: `0.03 – 0.04 kg CO2e/km`

  * Metro / Intracity Bus: `0.015 – 0.04 kg CO2e/pax-km`

## 🔒 API Surface, Security & Accessibility

| Route | Method | Cache / Limits | Responsibilities | 
| ----- | ----- | ----- | ----- | 
| `/api/air-quality` | `GET` | `15m` cache | Parallel Open-Meteo AQ + Weather fetch; CPCB/US math, Safe Windows, M/A/E plan, `simulateStale=true`. | 
| `/api/geocode` | `GET` | `24h` cache | Pan-India city search via Open-Meteo Geocoding (`2–60` chars). | 
| `/api/reverse-geocode` | `GET` | `24h` cache | Server-side OSM Nominatim GPS neighborhood resolution (`8s` timeout). | 
| `/api/room-scan` | `POST` | Rate-limited, `<= 4 MB` | Gemini 2.5 Flash → Groq `qwen/qwen3.8-27b` Vision failover with Zod validation. | 
| `/api/simulate` | `POST` | Deterministic | Exposure vs. WRI India $\text{CO}_2\text{e}$ calculator (`1×` / `5×` / `22×` horizons). | 
| `/api/chat` | `POST` | Rate-limited, `<= 800` chars | Cross-screen context-injected EN/Tamil consultant (Gemini → Groq failover). | 
| `/api/voice/transcribe` | `POST` | Rate-limited, `<= 10 MB` | Groq `whisper-large-v3-turbo` multilingual STT (EN & TA). | 
| `/api/voice/speak` | `POST` | Rate-limited, `<= 1000` chars | Groq `orpheus-v1-english` WAV stream (EN) + browser TTS fallback flag (TA). | 
| `/api/actions` | `GET/POST/PATCH` | Firebase ID Token | Strictly isolated `users/{uid}/actions/{id}` CRUD when Cloud Sync is enabled. | 

* **Strict Secret Isolation:** `GEMINI_API_KEY` and `GROQ_API_KEY` are loaded exclusively inside Node.js Route Handlers with runtime client-bundle guards.

* **Medical & Sensor Boundaries:** Never diagnoses medical conditions or guarantees outdoor safety; explicitly discloses that outdoor telemetry and room photos are not physical indoor air measurements.

* **WCAG AA Accessibility:** Full semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `role="log"`), `aria-live="polite"` dynamic updates, `aria-pressed` / `aria-expanded` / `aria-checked` states, keyboard focus rings, and $\ge 4.5:1$ contrast ratios.

## 🛠️ Tech Stack

## 🧪 Verified Quality Gates

Every release passes all four automated engineering gates with zero errors:

```
# 1. TypeScript Strict Typecheck  ->  0 errors
npx tsc --noEmit

# 2. ESLint Code Quality          ->  0 errors, 0 warnings
npm run lint

# 3. Vitest Automated Test Suite  ->  53/53 passing across 11 suites
npm test

# 4. Next.js 15 Production Build  ->  Compiled cleanly (~6.5s)
npm run build

```

## 🚀 Local Setup & Deployment

### 1. Clone & Install

```
git clone https://github.com/singinghearthari/AirQua-AI.git
cd AirQua-AI
npm install

```

### 2. Configure Environment Variables

```
cp .env.local.example .env.local

```

```
# Required — Primary Vision & Bilingual Consultant (Server-Only)
GEMINI_API_KEY=your_google_ai_studio_api_key

# Recommended — Automatic 429 Failover + Whisper STT & Orpheus TTS (Server-Only)
GROQ_API_KEY=your_groq_api_key

# Optional — Enables Google & Email/Password Auth + Cloud Firestore Sync
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

```

### 3. Run Locally or Deploy to Vercel

```
npm run dev
# Open http://localhost:3000

```

To deploy on **Vercel**, import the GitHub repository, add `GEMINI_API_KEY` (and optional `GROQ_API_KEY` / `NEXT_PUBLIC_FIREBASE_*` keys) under **Project Settings → Environment Variables**, and deploy.

Built with precision by **Hariharan Jayakumar** for **PromptWars Virtual • Challenge 6**

Live App • GitHub Repository
