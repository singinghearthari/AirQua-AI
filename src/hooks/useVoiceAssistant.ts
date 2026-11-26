'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '@/types/airqua';
import {
  getBrowserSpeechRecognition,
  speakWithBrowserSynthesis,
  SpeechRecognitionInstance,
  subscribeToVoicesChanged,
} from '@/lib/voice/browserSpeech';
import { startMediaRecorderCapture } from '@/lib/voice/mediaRecorderCapture';
import { stripMarkdownForSpeech } from '@/lib/voice/speechUtils';

export { stripMarkdownForSpeech } from '@/lib/voice/speechUtils';

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  transcript: string;
  sttSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
  speak: (text: string, lang?: SupportedLanguage) => void;
  stopSpeaking: () => void;
}

function stopMediaStreamRef(ref: { current: MediaStream | null }): void {
  ref.current?.getTracks().forEach((track) => track.stop());
}

/**
 * React hook providing bilingual (`en-IN` / `ta-IN`) Voice Input (Groq Whisper with browser
 * SpeechRecognition fallback) and unified bilingual Web Speech Voice Readout so both English
 * and Tamil replies share the same Tamil-capable voice.
 */
export function useVoiceAssistant(
  activeLanguage: SupportedLanguage = 'en',
  onSpeechResult?: (text: string) => void
): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const [sttSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasMediaRecorder =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';
    return hasMediaRecorder || Boolean(getBrowserSpeechRecognition());
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const cancelPendingSpeechRef = useRef<() => void>(() => {});
  const onSpeechResultRef = useRef(onSpeechResult);

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = getBrowserSpeechRecognition();
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }

    let unsubscribeVoices = () => {};
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      unsubscribeVoices = subscribeToVoicesChanged(window.speechSynthesis, (voice) => {
        preferredVoiceRef.current = voice;
      });
    }

    const recognition = recognitionRef.current;
    const synth = synthRef.current;

    return () => {
      try {
        cancelPendingSpeechRef.current();
        unsubscribeVoices();
        recognition?.abort();
        synth?.cancel();
        stopMediaStreamRef(streamRef);
      } catch {
        // Ignore teardown errors when media handles are already released
      }
    };
  }, []);

  const startBrowserRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.lang = activeLanguage === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        onSpeechResultRef.current?.(currentText);
      };
      recognition.onerror = (event) => {
        console.warn('Browser SpeechRecognition error:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.warn('Failed to start browser SpeechRecognition:', err);
      setIsListening(false);
    }
  }, [activeLanguage]);

  const stopSpeaking = useCallback(() => {
    try {
      cancelPendingSpeechRef.current();
      cancelPendingSpeechRef.current = () => {};
      synthRef.current?.cancel();
    } catch {
      // Ignore cleanup exceptions
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(async () => {
    stopSpeaking();
    const capturedViaMediaRecorder = await startMediaRecorderCapture({
      activeLanguage,
      mediaRecorderRef,
      audioChunksRef,
      streamRef,
      onListeningChange: setIsListening,
      onTranscript: (text) => {
        setTranscript(text);
        onSpeechResultRef.current?.(text);
      },
    });
    if (!capturedViaMediaRecorder) {
      startBrowserRecognition();
    }
  }, [activeLanguage, startBrowserRecognition, stopSpeaking]);

  const stopListening = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  const speak = useCallback(
    (text: string) => {
      if (!text) return;
      stopSpeaking();

      const cleanText = stripMarkdownForSpeech(text);
      if (!cleanText) return;

      cancelPendingSpeechRef.current = speakWithBrowserSynthesis({
        synth: synthRef.current,
        cleanText,
        preferredVoice: preferredVoiceRef.current,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
      });
    },
    [stopSpeaking]
  );

  return {
    isListening,
    transcript,
    sttSupported,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    ttsSupported,
    speak,
    stopSpeaking,
  };
}
