import { ConsultantResponse } from '@/lib/gemini/schemas';
import { ProvenanceKind } from '@/components/chat/ProvenanceBadge';

export interface MessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  structured?: ConsultantResponse;
  provenance?: ProvenanceKind;
  aiProvider?: 'gemini' | 'groq-backup';
  timestamp: string;
  saved?: boolean;
}

export const STORAGE_CHAT_KEY = 'airqua_chat_history_v2';
export const STORAGE_AUTO_READ_KEY = 'airqua_auto_read_v2';

let messageIdSeq = 0;

/**
 * Generates a collision-free unique message ID for client chat bubbles.
 */
export function getNextMessageId(prefix: 'user' | 'bot'): string {
  messageIdSeq += 1;
  return `${prefix}-${Date.now()}-${messageIdSeq}`;
}

/**
 * Constructs the initial grounded welcome message in English or Tamil.
 */
export function buildWelcomeMessage(
  cityName: string,
  language: string,
  persona: string
): MessageItem {
  const text =
    language === 'ta'
      ? `வணக்கம்! நான் ஏர்குவா AI. ${cityName}-ன் நேரலை CPCB தரவுகளின் அடிப்படையில் இயங்கும் உங்கள் குடும்ப காற்றுத் தர ஆலோசகர். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
      : `Hello! I am AIRQUA AI, grounded in live Copernicus and CPCB telemetry for ${cityName} and tailored to your active profile (${persona}). Ask about safe errand timing, cooking ventilation, or commute adjustments.`;

  return {
    id: 'initial-welcome',
    role: 'model',
    text,
    provenance: 'AI_GUIDANCE',
    timestamp: 'Verified Context',
  };
}

export function loadStoredChatMessages(): MessageItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_CHAT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as MessageItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.warn('[chatStorage] Failed to parse stored chat messages:', err);
    return null;
  }
}

export function loadAutoReadPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_AUTO_READ_KEY) === 'true';
  } catch (err) {
    console.warn('[chatStorage] Failed to read auto-read preference:', err);
    return false;
  }
}

export function loadCrossScreenContext(): {
  roomScan: { sceneType: string; findingsCount: number; summary: string } | null;
  simulatorSwaps: string[] | null;
} {
  if (typeof window === 'undefined') return { roomScan: null, simulatorSwaps: null };
  let roomScan: { sceneType: string; findingsCount: number; summary: string } | null = null;
  let simulatorSwaps: string[] | null = null;

  try {
    const rawScan = localStorage.getItem('airqua_last_room_scan_v2');
    if (rawScan) roomScan = JSON.parse(rawScan);
  } catch (err) {
    console.warn('[chatStorage] Failed to parse stored room scan summary:', err);
    roomScan = null;
  }

  try {
    const rawSwaps = localStorage.getItem('airqua_simulator_swaps_v2');
    if (rawSwaps) simulatorSwaps = JSON.parse(rawSwaps) as string[];
  } catch (err) {
    console.warn('[chatStorage] Failed to parse stored simulator swaps:', err);
    simulatorSwaps = null;
  }

  return { roomScan, simulatorSwaps };
}

/**
 * Formats an ISO timestamp clock label (`HH:MM` or `hh:mm AM/PM`) identically across server UTC
 * and client timezones (`Asia/Kolkata` fallback for zoned timestamps, direct wall-clock for naive ISOs).
 */
export function formatIsoClockTime(isoString: string, hour12: boolean): string {
  const localMatch = isoString.match(/T(\d{2}):(\d{2})(?!.*(?:Z|[+-]\d{2}:\d{2}))/);
  if (localMatch) {
    const hours = Number(localMatch[1]);
    const minutes = localMatch[2];
    if (!hour12) {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    const h12 = hours % 12 || 12;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    return `${String(h12).padStart(2, '0')}:${minutes} ${suffix}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(isoString));
}

/**
 * Formats the primary outdoor Safe Window start–end range in 24-hour HH:MM form.
 */
export function formatBestWindowLabel(
  safeWindows?: { bestOutdoorWindow?: { startISO: string; endISO: string } | null } | null
): string {
  const best = safeWindows?.bestOutdoorWindow;
  if (!best) return '12:00–15:00';
  return `${formatIsoClockTime(best.startISO, false)}–${formatIsoClockTime(best.endISO, false)}`;
}

/**
 * Builds the 4 starter quick-prompt pills for the consultant composer.
 */
export function buildQuickPrompts(
  configuredPrompts: string[] | undefined,
  language: string
): string[] {
  const prompts = configuredPrompts ?? [];
  return [
    prompts[0] || 'What should I change today?',
    prompts[1] || 'How do I reduce cooking smoke?',
    prompts[2] || 'Why are you recommending this?',
    language === 'en' ? 'தமிழில் விளக்குங்கள்' : 'Explain in English',
  ];
}
