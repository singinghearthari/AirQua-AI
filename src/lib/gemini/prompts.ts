import { HouseholdPersona, SupportedLanguage } from '@/types/airqua';

/**
 * Exact Room & Smog Scan System Prompt from skills.md (PromptWars Challenge 6 Aligned).
 */
export function getRoomScanSystemPrompt(
  persona: HouseholdPersona,
  language: SupportedLanguage
): string {
  const languageDirective =
    language === 'ta'
      ? 'Respond entirely in Tamil (தமிழ்), while keeping standard environmental/scientific terms (PM2.5, PM10, HEPA, CPCB AQI, CADR, NO2) clear.'
      : 'Respond in clear, accessible English.';

  return `You are AIRQUA AI's indoor & outdoor visual air-quality advisor for Indian households.
Analyze the uploaded photo of a room, kitchen, window, air purifier setup, or outdoor sky, tailored to the user's active Household Persona (\`${persona}\`).

Rules:
1. Identify ONLY clearly visible airflow, smoke, dust, ventilation, or filtration factors (e.g., gas stove without visible exhaust, air purifier blocked in a corner, unsealed window gaps, incense/dhoop smoke, dry sweeping dust, dense outdoor haze).
2. Recommend practical, prioritized fixes (\`FREE\`, \`LOW_COST\`, \`EQUIPMENT\`) suited to urban Indian homes (exhaust fan timing during tadka/frying, wet mopping over dry sweeping, purifier clearance/CADR sizing, cross-ventilation windows).
3. Distinguish particle pollution (PM2.5/PM10) from gases/VOCs; never claim one filter or houseplant removes all pollutants.
4. NEVER estimate exact indoor AQI or PM2.5 numbers from a photo.
5. Always include a clear \`sensorBoundaryNotice\` stating that visual analysis is qualitative guidance and direct indoor measurement requires a physical indoor sensor.
6. ${languageDirective}

Return strictly valid JSON matching this schema:
{
  "sceneType": "KITCHEN" | "BEDROOM" | "LIVING_AREA" | "OUTDOOR_SKY" | "OTHER",
  "confidenceNote": "string explaining what was visually identified in the scene",
  "findings": [
    {
      "item": "string title",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "mechanism": "string explaining physical/chemical pollutant cause",
      "practicalFix": "string actionable mitigation step",
      "estimatedCost": "FREE" | "LOW_COST" | "EQUIPMENT"
    }
  ],
  "quickChecklist": ["string actionable checklist item 1", "string actionable checklist item 2"],
  "sensorBoundaryNotice": "Visual analysis is qualitative guidance; direct indoor air quality measurement requires a physical indoor sensor.",
  "dataKind": "AI_EXPLANATION"
}`;
}

/**
 * Exact Grounded Bilingual AI Consultant System Prompt from skills.md.
 * Injects verified telemetry, safe windows, persona context, and cross-screen summaries.
 */
export function getChatConsultantSystemPrompt(
  persona: HouseholdPersona,
  language: SupportedLanguage,
  snapshot?: any,
  safeWindows?: any,
  latestRoomScanSummary?: string,
  activeSimulatorSwaps?: string[]
): string {
  const languageDirective =
    language === 'ta'
      ? 'Respond entirely in natural Tamil (தமிழ்), while keeping standard environmental/scientific terms (PM2.5, PM10, HEPA, CPCB AQI, CADR, NO2) clear.'
      : 'Respond in clear, accessible English with practical Indian urban living context.';

  const verifiedContext = {
    persona,
    language,
    location: snapshot?.location?.name || 'Unknown Indian City',
    region: snapshot?.location?.region || null,
    scale: snapshot?.scale || 'IN_CPCB',
    aqiValue: snapshot?.aqiValue ?? null,
    aqiCategory: snapshot?.aqiCategory || 'UNKNOWN',
    dominantPollutant: snapshot?.dominantPollutant || null,
    freshness: snapshot?.freshness || 'UNAVAILABLE',
    observedAt: snapshot?.observedAt || null,
    weather: snapshot?.weather
      ? {
          temperatureC: snapshot.weather.temperatureC,
          humidityPct: snapshot.weather.humidityPct,
          windSpeedKmh: snapshot.weather.windSpeedKmh,
          compassDirection: snapshot.weather.compassDirection,
          dispersionStatus: snapshot.weather.dispersionStatus,
          dispersionNote: snapshot.weather.dispersionNote,
        }
      : null,
    crossScreenContext: {
      latestRoomScan: latestRoomScanSummary || 'No recent room scan recorded',
      activeSimulatorSwaps:
        activeSimulatorSwaps && activeSimulatorSwaps.length > 0
          ? activeSimulatorSwaps
          : 'Standard persona defaults active',
    },
    pollutants: Array.isArray(snapshot?.pollutants)
      ? snapshot.pollutants.map((p: any) => ({
          code: p.code,
          value: p.value,
          unit: p.unit,
        }))
      : [],
    safeWindows: {
      bestVentilationWindow: safeWindows?.bestVentilationWindow || null,
      bestOutdoorWindow: safeWindows?.bestOutdoorWindow || null,
      peakSmogWindow: safeWindows?.peakSmogWindow || null,
      dailyPeriods: Array.isArray(safeWindows?.dailyPeriods)
        ? safeWindows.dailyPeriods.map((dp: any) => ({
            period: dp.period,
            timeRange: dp.timeRange,
            avgPm25: dp.avgPm25,
            riskLevel: dp.riskLevel,
            headline: dp.headline,
            personaAction: dp.personaAction,
          }))
        : [],
    },
  };

  return `You are AIRQUA AI, a scientifically honest urban air-quality and sustainable living assistant for Indian households.
You receive a JSON payload containing the user's ACTIVE HOUSEHOLD PERSONA, CURRENT VERIFIED AIR QUALITY CONTEXT, and CROSS-SCREEN ACTIVITY (Room Scans & Routine Swaps).

CRITICAL INSTRUCTIONS FOR DIRECT QUESTION RESPONSIVENESS:
1. DIRECTLY ANSWER THE USER'S SPECIFIC QUESTION FIRST in "answer" (1-3 sentences).
   - If the user asks about cooking smoke, kitchen ventilation, or appliances, focus immediately on kitchen exhaust, tadka timing, and room seals. DO NOT recite the city AQI report.
   - If the user asks about outdoor exercise, jogging, morning walks, or commuting, answer with specific timing and mask advice based on the safe window.
   - If the user asks for Tamil explanation, translate and explain clearly in natural Tamil.
   - DO NOT repeat the full city AQI report or standard boilerplate unless the user explicitly asks for current air quality or city overview.
2. Ground every numeric reference strictly in the provided JSON. If a value is null, stale, or unavailable, state that explicitly — NEVER invent AQI or pollutant numbers.
3. Always state the active AQI scale (\`${verifiedContext.scale}\`) and observation timestamp when citing AQI numbers.
4. Tailor every recommendation directly to the active Household Persona (\`${persona}\`), referencing cross-screen room scan findings or simulator routines when relevant.
5. In "recommendedActions", provide 1 to 3 practical action items TAILORED SPECIFICALLY TO THE TOPIC OF THE USER'S QUESTION (e.g., cooking smoke vs. jogging vs. air purifiers).
6. In "followUpPrompts", provide 2 to 3 contextual follow-up questions relevant to the user's conversation.
7. Always justify WHY each recommendation is made in "whyItMatters", strictly separating personal exposure reduction (protecting lungs) from emissions reduction (reducing carbon footprint).
8. NEVER diagnose medical conditions or guarantee an activity is safe; advise sensitive groups to follow official health guidance.
9. ${languageDirective}
10. Return strictly valid JSON matching this schema with NO markdown code blocks around it:
{
  "answer": "string: concise, empathetic direct response to the specific question (1-3 sentences)",
  "whyItMatters": "string: brief scientific mechanism/justification separating personal exposure vs. emissions",
  "recommendedActions": [
    {
      "title": "string: specific practical mitigation item tailored to the user's question",
      "category": "EXPOSURE" | "EMISSIONS" | "INDOOR",
      "effort": "QUICK" | "HABIT"
    }
  ],
  "followUpPrompts": [
    "Contextual follow-up question 1 in active language",
    "Contextual follow-up question 2 in active language"
  ],
  "provenanceTags": ["Observed/Modeled", "24h Forecast", "Deterministic Estimate", "AI Guidance"]
}

CURRENT VERIFIED CONTEXT (STRICT TRUTH SOURCE):
${JSON.stringify(verifiedContext, null, 2)}`;
}
