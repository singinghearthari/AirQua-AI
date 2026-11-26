import { SupportedLanguage } from '@/types/airqua';

export interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  0: SpeechRecognitionResultAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  mozSpeechRecognition?: SpeechRecognitionConstructor;
  msSpeechRecognition?: SpeechRecognitionConstructor;
}

/**
 * Resolves a constructor for the Web Speech API `SpeechRecognition` across browser prefixes.
 */
export function getBrowserSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as SpeechWindow;
  return (
    win.SpeechRecognition ||
    win.webkitSpeechRecognition ||
    win.mozSpeechRecognition ||
    win.msSpeechRecognition ||
    null
  );
}

/**
 * Awaits asynchronous voice list population (`voiceschanged`) when `synth.getVoices()` initially
 * returns empty in Chromium/Edge browsers, bounded by a short timeout so playback never stalls.
 */
async function loadVoicesAsync(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const initial = synth.getVoices();
  if (initial.length > 0) return initial;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', finish);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(finish, 450);
    synth.addEventListener?.('voiceschanged', finish, { once: true });
  });
}

function selectPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang: SupportedLanguage
): SpeechSynthesisVoice | null {
  if (lang === 'ta') {
    const tamilVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ta'));
    return tamilVoices.find((v) => v.lang.toLowerCase() === 'ta-in') ?? tamilVoices[0] ?? null;
  }

  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  return (
    englishVoices.find((v) => v.lang.toLowerCase() === 'en-in') ??
    englishVoices.find((v) => v.lang.toLowerCase() === 'en-us') ??
    englishVoices.find((v) => v.default) ??
    englishVoices[0] ??
    null
  );
}

/**
 * Speaks sanitized text via the browser `SpeechSynthesis` API in Indian English (`en-IN`/`en-US`) or
 * Tamil (`ta-IN`). Never falls back to a non-Tamil voice for Tamil text so Tamil words are never skipped.
 */
export async function speakWithBrowserSynthesis(
  synth: SpeechSynthesis | null,
  cleanText: string,
  lang: SupportedLanguage,
  onStart: () => void,
  onDone: () => void,
  onVoiceNotice?: (notice: string | null) => void
): Promise<void> {
  if (!synth || !cleanText) {
    if (lang === 'ta') {
      onVoiceNotice?.('Tamil voice audio is temporarily unavailable on this device');
    }
    onDone();
    return;
  }

  try {
    synth.cancel();
    const voices = await loadVoicesAsync(synth);
    const preferredVoice = selectPreferredVoice(voices, lang);

    if (lang === 'ta' && !preferredVoice) {
      onVoiceNotice?.('Tamil voice audio is temporarily unavailable on this device');
      onDone();
      return;
    }

    onVoiceNotice?.(null);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ta' ? 'ta-IN' : preferredVoice?.lang || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = onStart;
    utterance.onend = onDone;
    utterance.onerror = onDone;
    synth.speak(utterance);
  } catch (err) {
    console.warn('Browser SpeechSynthesis error:', err);
    onDone();
  }
}
