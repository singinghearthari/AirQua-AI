'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '@/types/airqua';

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

/**
 * Strips Markdown formatting so Web Speech synthesis speaks clean, natural language.
 */
export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) -> link text
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // bold/italic/strike
    .replace(/^#+\s+/gm, '') // headings
    .replace(/^[-*+•]\s+/gm, '') // bullets
    .replace(/^\d+\.\s+/gm, '') // numbered items
    .replace(/>\s+/gm, '') // quotes
    .replace(/\s+/g, ' ')
    .trim();
}

export function useVoiceAssistant(
  activeLanguage: SupportedLanguage = 'en',
  onSpeechResult?: (text: string) => void
): UseVoiceAssistantReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // STT Supported: Either Groq MediaRecorder OR Browser SpeechRecognition
  const [sttSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasMediaRecorder =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';
    const hasSpeechRecognition = Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    );
    return hasMediaRecorder || hasSpeechRecognition;
  });

  // TTS Supported: Either server /api/voice/speak or browser SpeechSynthesis
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window || typeof Audio !== 'undefined';
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const onSpeechResultRef = useRef(onSpeechResult);

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  // Initialize Browser Fallback APIs safely
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check Speech Recognition (STT fallback)
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

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

    // Check Speech Synthesis (TTS fallback)
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch {}
      }
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch {}
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
      }
    };
  }, []);

  // Browser SpeechSynthesis fallback helper
  const speakWithBrowserSynthesis = useCallback(
    (cleanText: string, lang: SupportedLanguage) => {
      if (!synthRef.current || !cleanText) {
        setIsSpeaking(false);
        return;
      }

      try {
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const targetLocale = lang === 'ta' ? 'ta-IN' : 'en-IN';
        utterance.lang = targetLocale;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(lang === 'ta' ? 'ta' : 'en') &&
            (v.lang.includes('IN') || v.default)
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        synthRef.current.speak(utterance);
      } catch (err) {
        console.warn('Browser SpeechSynthesis error:', err);
        setIsSpeaking(false);
      }
    },
    []
  );

  // Browser SpeechRecognition fallback helper
  const startBrowserRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.lang = activeLanguage === 'ta' ? 'ta-IN' : 'en-IN';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        if (onSpeechResultRef.current) {
          onSpeechResultRef.current(currentText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.warn('Browser SpeechRecognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      console.warn('Failed to start browser SpeechRecognition:', err);
      setIsListening(false);
    }
  }, [activeLanguage]);

  // Stop any active speaking (Groq Audio or Browser Speech)
  const stopSpeaking = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch {}
    }
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  }, []);

  // Start Voice Input (Attempts MediaRecorder -> Groq Whisper, falls back to Browser STT)
  const startListening = useCallback(async () => {
    // Cancel any active speech
    stopSpeaking();

    // 1. Try MediaRecorder with Groq Whisper
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          setIsListening(false);
          // Release microphone
          stream.getTracks().forEach((track) => track.stop());

          if (audioChunksRef.current.length === 0) return;

          const recordedBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm',
          });

          // Send to Groq Whisper endpoint
          try {
            const formData = new FormData();
            formData.append('file', recordedBlob, 'speech.webm');
            formData.append('language', activeLanguage);

            const response = await fetch('/api/voice/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text) {
                setTranscript(data.text);
                if (onSpeechResultRef.current) {
                  onSpeechResultRef.current(data.text);
                }
                return;
              }
            }
          } catch (transcribeErr) {
            console.warn('Groq Whisper transcribe request failed:', transcribeErr);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
        return;
      } catch (mediaErr) {
        console.warn('MediaRecorder setup failed, falling back to browser SpeechRecognition:', mediaErr);
      }
    }

    // 2. Fallback to Browser SpeechRecognition
    startBrowserRecognition();
  }, [activeLanguage, startBrowserRecognition, stopSpeaking]);

  // Stop Listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Speak (Attempts Groq Orpheus Neural Audio for English, falls back to Browser SpeechSynthesis)
  const speak = useCallback(
    async (text: string, lang: SupportedLanguage = activeLanguage) => {
      if (!text) return;
      stopSpeaking();

      const cleanText = stripMarkdownForSpeech(text);
      if (!cleanText) return;

      // For English, attempt Groq Orpheus TTS endpoint first
      if (lang === 'en') {
        try {
          const res = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, language: 'en' }),
          });

          const contentType = res.headers.get('content-type') || '';

          if (res.ok && contentType.includes('audio')) {
            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            activeAudioRef.current = audio;

            audio.onplay = () => {
              setIsSpeaking(true);
            };

            audio.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              activeAudioRef.current = null;
            };

            audio.onerror = () => {
              console.warn('Audio playback error, falling back to browser synthesis.');
              URL.revokeObjectURL(audioUrl);
              activeAudioRef.current = null;
              speakWithBrowserSynthesis(cleanText, lang);
            };

            await audio.play();
            return;
          }
        } catch (fetchErr) {
          console.warn('Groq speech endpoint fetch failed, falling back to browser synthesis:', fetchErr);
        }
      }

      // Smooth fallback to Browser SpeechSynthesis (or default for Tamil)
      speakWithBrowserSynthesis(cleanText, lang);
    },
    [activeLanguage, speakWithBrowserSynthesis, stopSpeaking]
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
