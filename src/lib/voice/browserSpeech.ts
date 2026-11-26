import { TIMEOUTS_MS } from '@/lib/config/timeouts';

const TAMIL_UNICODE_REGEX = /[\u0B80-\u0BFF]/;

export interface SpeechVoiceLike {
  name: string;
  lang: string;
  default?: boolean;
}

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

export interface SpeakBrowserOptions {
  synth: SpeechSynthesis | null;
  cleanText: string;
  preferredVoice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  onStart: () => void;
  onDone: () => void;
}

/**
 * Returns true when the text contains any Tamil script codepoints (`U+0B80..U+0BFF`).
 */
export function containsTamilUnicode(text: string): boolean {
  return TAMIL_UNICODE_REGEX.test(text);
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

function normalizeVoiceLang(lang: string): string {
  return lang.trim().toLowerCase().replace('_', '-');
}

/**
 * Deterministically selects a single bilingual voice used across both Tamil and English replies:
 * 1) A `ta-IN` / Tamil voice (capable of pronouncing both Tamil and English seamlessly).
 * 2) An Indian English (`en-IN`) fallback if no Tamil voice is installed.
 * 3) The browser's default voice (or first available voice).
 */
export function selectBilingualSpeechVoice<T extends SpeechVoiceLike>(
  voices: readonly T[]
): T | null {
  if (!voices || voices.length === 0) return null;

  const taInVoices = voices.filter((v) => normalizeVoiceLang(v.lang) === 'ta-in');
  if (taInVoices.length > 0) {
    return (
      taInVoices.find((v) => /google|valluvar|pallavi|natural/i.test(v.name)) ??
      taInVoices[0]
    );
  }

  const anyTaVoice = voices.find((v) => {
    const lang = normalizeVoiceLang(v.lang);
    return lang === 'ta' || lang.startsWith('ta-') || v.name.toLowerCase().includes('tamil');
  });
  if (anyTaVoice) {
    return anyTaVoice;
  }

  const enInVoices = voices.filter((v) => normalizeVoiceLang(v.lang) === 'en-in');
  if (enInVoices.length > 0) {
    return (
      enInVoices.find((v) => Boolean(v.default)) ??
      enInVoices.find((v) => /google|heera|ravi|prabhat|neerja|natural/i.test(v.name)) ??
      enInVoices[0]
    );
  }

  return voices.find((v) => Boolean(v.default)) ?? voices[0] ?? null;
}

/**
 * Resolves the `utterance.lang` tag dynamically: `ta-IN` whenever Tamil Unicode script is
 * present, otherwise the selected voice's `lang` or `en-IN`.
 */
export function resolveUtteranceLang(
  cleanText: string,
  selectedVoice?: Pick<SpeechVoiceLike, 'lang'> | null
): string {
  if (containsTamilUnicode(cleanText)) {
    return 'ta-IN';
  }
  const voiceLang = selectedVoice?.lang?.trim();
  return voiceLang || 'en-IN';
}

/**
 * Loads the current Web Speech voice selection and subscribes to async `voiceschanged` events.
 */
export function subscribeToVoicesChanged(
  synth: SpeechSynthesis,
  onVoiceResolved: (voice: SpeechSynthesisVoice | null) => void
): () => void {
  const resolveAndNotify = () => {
    const voices = synth.getVoices();
    if (voices.length > 0) {
      onVoiceResolved(selectBilingualSpeechVoice(voices));
    }
  };

  resolveAndNotify();

  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', resolveAndNotify);
    return () => synth.removeEventListener('voiceschanged', resolveAndNotify);
  }

  synth.onvoiceschanged = resolveAndNotify;
  return () => {
    if (synth.onvoiceschanged === resolveAndNotify) {
      synth.onvoiceschanged = null;
    }
  };
}

/**
 * Speaks sanitized text via the browser `SpeechSynthesis` API using the unified bilingual voice.
 * Returns a cancellation callback that aborts any pending async `voiceschanged` wait.
 */
export function speakWithBrowserSynthesis({
  synth,
  cleanText,
  preferredVoice = null,
  rate = 0.96,
  pitch = 1.0,
  onStart,
  onDone,
}: SpeakBrowserOptions): () => void {
  if (!synth || !cleanText) {
    onDone();
    return () => {};
  }

  const dispatchUtterance = (voice: SpeechSynthesisVoice | null) => {
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = resolveUtteranceLang(cleanText, voice);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.onstart = onStart;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      synth.speak(utterance);
    } catch (err) {
      console.warn('Browser SpeechSynthesis error:', err);
      onDone();
    }
  };

  try {
    synth.cancel();
    const initialVoices = synth.getVoices();
    if (initialVoices.length > 0 || preferredVoice) {
      const resolved = selectBilingualSpeechVoice(initialVoices) ?? preferredVoice;
      dispatchUtterance(resolved);
      return () => {};
    }

    let settled = false;
    let removeVoiceListener: () => void = () => {};
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finalize = () => {
      if (settled) return;
      settled = true;
      removeVoiceListener();
      if (timeoutId !== null) clearTimeout(timeoutId);
      const resolved = selectBilingualSpeechVoice(synth.getVoices());
      dispatchUtterance(resolved);
    };

    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', finalize);
      removeVoiceListener = () => synth.removeEventListener('voiceschanged', finalize);
    }

    timeoutId = setTimeout(finalize, TIMEOUTS_MS.VOICE_HYDRATION);

    return () => {
      settled = true;
      removeVoiceListener();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  } catch (err) {
    console.warn('Browser SpeechSynthesis error:', err);
    onDone();
    return () => {};
  }
}
