'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '@/types/airqua';
import {
  getBrowserSpeechRecognition,
  speakWithBrowserSynthesis,
  SpeechRecognitionInstance,
} from '@/lib/voice/browserSpeech';
import { startMediaRecorderCapture } from '@/lib/voice/mediaRecorderCapture';
import {
  playEnglishGroqOrFallback,
  resetActiveAudioElement,
} from '@/lib/voice/groqSpeechPlayback';
import {
  detectMessageLanguage,
  stripMarkdownForSpeech,
} from '@/lib/voice/speechUtils';

export { detectMessageLanguage, stripMarkdownForSpeech } from '@/lib/voice/speechUtils';

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  transcript: string;
  sttSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
  voiceNotice: string | null;
  dismissVoiceNotice: () => void;
  speak: (text: string, lang?: SupportedLanguage) => void;
  stopSpeaking: () => void;
}

function stopMediaStreamRef(ref: { current: MediaStream | null }): void {
  ref.current?.getTracks().forEach((track) => track.stop());
}

/**
 * React hook providing bilingual (`en-IN` / `ta-IN`) Voice Input (auto-detecting Groq Whisper with
 * browser SpeechRecognition fallback) and content-detected Voice Readout (Groq Orpheus EN +
 * browser `ta-IN` / `en-IN` SpeechSynthesis fallback).
 */
export function useVoiceAssistant(
  activeLanguage: SupportedLanguage = 'en',
  onSpeechResult?: (text: string) => void
): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

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
    return 'speechSynthesis' in window || typeof Audio !== 'undefined';
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
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

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    const recognition = recognitionRef.current;
    const synth = synthRef.current;

    return () => {
      try {
        recognition?.abort();
        synth?.cancel();
        resetActiveAudioElement(activeAudioRef, activeAudioUrlRef);
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
      resetActiveAudioElement(activeAudioRef, activeAudioUrlRef);
      synthRef.current?.cancel();
    } catch {
      // Ignore cleanup exceptions
    }
    setIsSpeaking(false);
  }, []);

  const dismissVoiceNotice = useCallback(() => setVoiceNotice(null), []);

  const startListening = useCallback(async () => {
    stopSpeaking();
    setVoiceNotice(null);
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
    async (text: string) => {
      if (!text) return;
      stopSpeaking();
      setVoiceNotice(null);

      const cleanText = stripMarkdownForSpeech(text);
      if (!cleanText) return;

      // Always determine TTS engine from the message script itself, independent of UI language toggle
      const detectedLang = detectMessageLanguage(cleanText);

      if (detectedLang === 'en') {
        await playEnglishGroqOrFallback({
          cleanText,
          synth: synthRef.current,
          activeAudioRef,
          activeAudioUrlRef,
          onStart: () => setIsSpeaking(true),
          onDone: () => setIsSpeaking(false),
          onVoiceNotice: setVoiceNotice,
        });
        return;
      }

      await speakWithBrowserSynthesis(
        synthRef.current,
        cleanText,
        'ta',
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        setVoiceNotice
      );
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
    voiceNotice,
    dismissVoiceNotice,
    speak,
    stopSpeaking,
  };
}
