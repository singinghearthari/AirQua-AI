/**
 * Centralized network, AI provider, voice hydration, and UI timer constants (ms).
 */
export const TIMEOUTS_MS = {
  /** Default upstream HTTP request timeout in API utilities. */
  HTTP_DEFAULT: 8000,
  /** Primary/backup generative AI request timeout (Gemini & Groq). */
  AI_UPSTREAM: 15000,
  /** Open-Meteo Air Quality forecast request timeout. */
  OPEN_METEO_AIR_QUALITY: 12000,
  /** Open-Meteo geocoding city search request timeout. */
  GEOCODE_SEARCH: 6000,
  /** OpenStreetMap Nominatim reverse geocoding request timeout. */
  REVERSE_GEOCODE: 8000,
  /** Firebase IdentityToolkit token lookup request timeout. */
  FIREBASE_TOKEN_VERIFY: 6000,
  /** Open-Meteo weather telemetry request timeout. */
  WEATHER_TELEMETRY: 6000,
  /** Maximum initial wait for async `speechSynthesis.onvoiceschanged` hydration. */
  VOICE_HYDRATION: 150,
  /** Global notification toast auto-dismiss delay. */
  TOAST_DISMISS: 3200,
  /** Confirmation badge reset delay after saving room findings. */
  SAVED_BADGE_RESET: 3000,
  /** Debounce interval before logging simulator runs to Firestore history. */
  SIMULATION_LOG_DEBOUNCE: 2500,
} as const;
