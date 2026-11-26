import {
  AqiScale,
  CityPreset,
  HouseholdPersona,
  SupportedLanguage,
} from '@/types/airqua';
import { FEATURED_CITIES } from '@/lib/constants';
import type { SavedActionItem } from '@/context/AirquaContext';

export const STORAGE_SAVED_ACTIONS = 'airqua_saved_actions_v2';
export const STORAGE_PREFS = 'airqua_user_prefs_v2';

export interface StoredPreferences {
  city: CityPreset;
  persona: HouseholdPersona;
  scale: AqiScale;
  language: SupportedLanguage;
}

/**
 * Safely reads persisted user preferences from `localStorage` with defaults.
 */
export function loadStoredPreferences(): StoredPreferences {
  const defaults: StoredPreferences = {
    city: FEATURED_CITIES[0],
    persona: 'FAMILY_KIDS',
    scale: 'IN_CPCB',
    language: 'en',
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_PREFS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      city: parsed.city ?? defaults.city,
      persona: parsed.persona ?? defaults.persona,
      scale: parsed.scale ?? defaults.scale,
      language: parsed.language ?? defaults.language,
    };
  } catch {
    return defaults;
  }
}

/**
 * Persists user preferences into `localStorage` without throwing in restricted storage contexts.
 */
export function persistPreferences(prefs: StoredPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota / private-browsing write errors
  }
}

/**
 * Reads saved routine checklist actions from `localStorage`.
 */
export function loadStoredActions(): SavedActionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_ACTIONS);
    return raw ? (JSON.parse(raw) as SavedActionItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persists saved routine checklist actions into `localStorage`.
 */
export function persistActions(actions: SavedActionItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(actions));
  } catch {
    // Ignore storage quota / private-browsing write errors
  }
}
