import { SupportedLanguage } from '@/types/airqua';
import { speakWithBrowserSynthesis } from './browserSpeech';

export interface ServerSpeechPlaybackOptions {
  cleanText: string;
  targetLang: SupportedLanguage;
  synth: SpeechSynthesis | null;
  activeAudioRef: { current: HTMLAudioElement | null };
  activeAudioUrlRef: { current: string | null };
  onStart: () => void;
  onDone: () => void;
  onVoiceNotice?: (notice: string | null) => void;
}

/**
 * Releases any active `<audio>` playback and revokes its `blob:` URL so multiple
 * utterances never overlap or leak memory.
 */
export function resetActiveAudioElement(
  activeAudioRef: { current: HTMLAudioElement | null },
  activeAudioUrlRef: { current: string | null }
): void {
  if (activeAudioRef.current) {
    activeAudioRef.current.onplay = null;
    activeAudioRef.current.onended = null;
    activeAudioRef.current.onerror = null;
    activeAudioRef.current.pause();
    activeAudioRef.current.currentTime = 0;
    activeAudioRef.current = null;
  }
  if (activeAudioUrlRef.current) {
    URL.revokeObjectURL(activeAudioUrlRef.current);
    activeAudioUrlRef.current = null;
  }
}

/**
 * Fetches server TTS audio (`/api/voice/speak`) for English (`audio/wav`) or Tamil (`audio/mpeg`)
 * and transparently falls back to language-guarded browser `SpeechSynthesis` on failure or blocked autoplay.
 */
export async function playServerSpeechOrFallback(
  options: ServerSpeechPlaybackOptions
): Promise<void> {
  const {
    cleanText,
    targetLang,
    synth,
    activeAudioRef,
    activeAudioUrlRef,
    onStart,
    onDone,
    onVoiceNotice,
  } = options;

  const fallbackToBrowser = () =>
    speakWithBrowserSynthesis(synth, cleanText, targetLang, onStart, onDone, onVoiceNotice);

  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, language: targetLang }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('audio')) {
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      activeAudioUrlRef.current = audioUrl;
      activeAudioRef.current = audio;

      audio.onplay = onStart;
      audio.onended = () => {
        resetActiveAudioElement(activeAudioRef, activeAudioUrlRef);
        onDone();
      };
      audio.onerror = () => {
        resetActiveAudioElement(activeAudioRef, activeAudioUrlRef);
        void fallbackToBrowser();
      };

      try {
        await audio.play();
        return;
      } catch (playErr) {
        console.warn('Audio autoplay blocked, falling back to browser synthesis:', playErr);
        resetActiveAudioElement(activeAudioRef, activeAudioUrlRef);
      }
    }
  } catch (fetchErr) {
    console.warn('Speech endpoint fetch failed, falling back to browser synthesis:', fetchErr);
  }

  await fallbackToBrowser();
}
