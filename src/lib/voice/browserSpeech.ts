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
 * Speaks sanitized text via the browser `SpeechSynthesis` API in Indian English (`en-IN`) or Tamil (`ta-IN`).
 */
export function speakWithBrowserSynthesis(
  synth: SpeechSynthesis | null,
  cleanText: string,
  lang: SupportedLanguage,
  onStart: () => void,
  onDone: () => void
): void {
  if (!synth || !cleanText) {
    onDone();
    return;
  }

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(lang === 'ta' ? 'ta' : 'en') &&
        (v.lang.includes('IN') || v.default)
    );

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
