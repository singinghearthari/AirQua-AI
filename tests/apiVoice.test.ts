import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as transcribeHandler } from '@/app/api/voice/transcribe/route';
import { POST as speakHandler } from '@/app/api/voice/speak/route';
import {
  containsTamilUnicode,
  resolveUtteranceLang,
  selectBilingualSpeechVoice,
  speakWithBrowserSynthesis,
  SpeechVoiceLike,
} from '@/lib/voice/browserSpeech';
import * as groqClientModule from '@/lib/ai/groqClient';
import { NextRequest } from 'next/server';

type GroqClient = NonNullable<ReturnType<typeof groqClientModule.getGroqClient>>;

function asMockGroqVoiceClient(
  overrides: {
    transcriptionsCreate?: ReturnType<typeof vi.fn>;
    speechCreate?: ReturnType<typeof vi.fn>;
  }
): GroqClient {
  return {
    audio: {
      transcriptions: { create: overrides.transcriptionsCreate ?? vi.fn() },
      speech: { create: overrides.speechCreate ?? vi.fn() },
    },
  } as unknown as GroqClient;
}

describe('/api/voice/transcribe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid non-multipart body with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: 'not multipart',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid multipart/i);
  });

  it('rejects requests without audio file with status 400', async () => {
    const formData = new FormData();
    formData.append('language', 'en');

    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing audio file/i);
  });

  it('transcribes valid audio with Groq Whisper and returns text', async () => {
    const mockTranscribe = vi.fn().mockResolvedValue({
      text: 'What is today AQI in Delhi?',
    });

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqVoiceClient({ transcriptionsCreate: mockTranscribe })
    );

    const formData = new FormData();
    const fakeAudioBlob = new Blob(['RIFF....WAVEfmt '], { type: 'audio/wav' });
    formData.append('file', fakeAudioBlob, 'test.wav');
    formData.append('language', 'en');

    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.text).toBe('What is today AQI in Delhi?');
    expect(json.provider).toBe('groq-whisper');
    expect(mockTranscribe).toHaveBeenCalledTimes(1);
  });

  it('returns status 503 fallback when Groq client is unconfigured', async () => {
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(null);

    const formData = new FormData();
    const fakeAudioBlob = new Blob(['fake audio'], { type: 'audio/webm' });
    formData.append('file', fakeAudioBlob, 'test.webm');

    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.fallbackToBrowserSTT).toBe(true);
  });

  it('rejects audio files exceeding the 10 MB cap with status 413', async () => {
    const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 64);
    const formData = new FormData();
    formData.append('file', new Blob([oversizedBytes], { type: 'audio/webm' }), 'huge.webm');

    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toMatch(/10 MB limit/i);
  });

  it('returns status 502 with fallbackToBrowserSTT when Groq Whisper fails upstream', async () => {
    const mockTranscribeFail = vi.fn().mockRejectedValue(new Error('Whisper model error'));
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqVoiceClient({ transcriptionsCreate: mockTranscribeFail })
    );

    const formData = new FormData();
    formData.append('file', new Blob(['RIFF'], { type: 'audio/wav' }), 'sample.wav');
    formData.append('language', 'ta');

    const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeHandler(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.fallbackToBrowserSTT).toBe(true);
  });
});

describe('/api/voice/speak', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects malformed JSON body with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: '{invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects markdown-only text that sanitizes to empty string with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: '[ ](https://example.com) ```block```',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/empty after sanitization/i);
  });

  it('returns fallbackToBrowserTTS for Tamil (ta) to use native browser voices', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: 'சென்னையில் காற்று தரம் நன்று',
        language: 'ta',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.fallbackToBrowserTTS).toBe(true);
    expect(json.reason).toContain('Tamil');
  });

  it('rejects text exceeding 1000 characters with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: 'a'.repeat(1001),
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(400);
  });

  it('streams audio/wav for English speech when Groq Orpheus succeeds', async () => {
    const mockAudioBytes = new Uint8Array([82, 73, 70, 70]); // 'RIFF'
    const mockSpeechCreate = vi.fn().mockResolvedValue({
      arrayBuffer: async () => mockAudioBytes.buffer,
    });

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqVoiceClient({ speechCreate: mockSpeechCreate })
    );

    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Air quality in Delhi is currently moderate.',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('audio/wav');
    expect(mockSpeechCreate).toHaveBeenCalledTimes(1);
  });

  it('gracefully returns fallbackToBrowserTTS if Groq speech model errors', async () => {
    const mockSpeechCreate = vi.fn().mockRejectedValue(new Error('Terms required'));

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqVoiceClient({ speechCreate: mockSpeechCreate })
    );

    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Test speech error fallback',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallbackToBrowserTTS).toBe(true);
  });
});

interface MockUtterance {
  text: string;
  voice: SpeechVoiceLike | null;
  lang: string;
  rate: number;
  pitch: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

describe('Unified Bilingual Browser TTS Selector & Playback', () => {
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalUtterance === undefined) {
      Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
    } else {
      globalThis.SpeechSynthesisUtterance = originalUtterance;
    }
  });

  it('selects ta-IN Tamil voice in priority order over en-IN and browser default', () => {
    const voices: SpeechVoiceLike[] = [
      { name: 'Microsoft David', lang: 'en-US', default: true },
      { name: 'Google English India', lang: 'en-IN', default: false },
      { name: 'Google தமிழ்', lang: 'ta-IN', default: false },
    ];

    expect(selectBilingualSpeechVoice(voices)?.name).toBe('Google தமிழ்');
    expect(selectBilingualSpeechVoice(voices.slice(0, 2))?.name).toBe('Google English India');
    expect(selectBilingualSpeechVoice(voices.slice(0, 1))?.name).toBe('Microsoft David');
    expect(selectBilingualSpeechVoice([])).toBeNull();
  });

  it('detects Tamil Unicode and sets ta-IN for pure Tamil and mixed Tamil+English strings', () => {
    const tamilVoice: SpeechVoiceLike = { name: 'Microsoft Pallavi', lang: 'ta-IN', default: false };
    const enInVoice: SpeechVoiceLike = { name: 'Microsoft Heera', lang: 'en-IN', default: false };

    expect(containsTamilUnicode('இன்று காற்றின் தரம் மிதமானது')).toBe(true);
    expect(containsTamilUnicode('இன்று Delhi-ல் PM2.5 AQI 180 உள்ளது')).toBe(true);
    expect(containsTamilUnicode('Air quality in Chennai is Satisfactory')).toBe(false);

    expect(resolveUtteranceLang('இன்று Delhi-ல் PM2.5 AQI 180 உள்ளது', tamilVoice)).toBe('ta-IN');
    expect(resolveUtteranceLang('Air quality in Chennai is Satisfactory', tamilVoice)).toBe('ta-IN');
    expect(resolveUtteranceLang('Air quality in Chennai is Satisfactory', enInVoice)).toBe('en-IN');
    expect(resolveUtteranceLang('Air quality in Chennai is Satisfactory', null)).toBe('en-IN');
  });

  it('uses the same Tamil-capable bilingual voice for both English and Tamil playback', () => {
    const spokenUtterances: MockUtterance[] = [];
    class FakeUtterance implements MockUtterance {
      text: string;
      voice: SpeechVoiceLike | null = null;
      lang = '';
      rate = 1;
      pitch = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    globalThis.SpeechSynthesisUtterance =
      FakeUtterance as unknown as typeof SpeechSynthesisUtterance;

    const voices = [
      { name: 'Google US English', lang: 'en-US', default: true },
      { name: 'Google English India', lang: 'en-IN', default: false },
      { name: 'Google தமிழ்', lang: 'ta-IN', default: false },
    ] as unknown as SpeechSynthesisVoice[];

    const cancelMock = vi.fn();
    const speakMock = vi.fn((u: SpeechSynthesisUtterance) => {
      const mockU = u as unknown as MockUtterance;
      spokenUtterances.push(mockU);
      mockU.onstart?.();
      mockU.onend?.();
    });

    const mockSynth = {
      getVoices: () => voices,
      cancel: cancelMock,
      speak: speakMock,
    } as unknown as SpeechSynthesis;

    const onStart = vi.fn();
    const onDone = vi.fn();

    // Speak English reply
    speakWithBrowserSynthesis({
      synth: mockSynth,
      cleanText: 'In Delhi today, run kitchen exhaust while frying.',
      onStart,
      onDone,
    });

    // Speak mixed Tamil + English reply
    speakWithBrowserSynthesis({
      synth: mockSynth,
      cleanText: 'டெல்லியில் இன்று AQI 240. ஜன்னல்களை மூடி வைக்கவும்.',
      onStart,
      onDone,
    });

    expect(cancelMock).toHaveBeenCalledTimes(2);
    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(spokenUtterances[0].voice?.name).toBe('Google தமிழ்');
    expect(spokenUtterances[1].voice?.name).toBe('Google தமிழ்');
    expect(spokenUtterances[0].voice).toBe(spokenUtterances[1].voice);
    expect(spokenUtterances[1].lang).toBe('ta-IN');
    expect(spokenUtterances[0].rate).toBeGreaterThanOrEqual(0.95);
    expect(spokenUtterances[0].rate).toBeLessThanOrEqual(1.0);
    expect(spokenUtterances[0].pitch).toBe(1.0);
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('waits cleanly for async voiceschanged event when getVoices() starts empty', () => {
    const spokenUtterances: MockUtterance[] = [];
    class FakeUtterance implements MockUtterance {
      text: string;
      voice: SpeechVoiceLike | null = null;
      lang = '';
      rate = 1;
      pitch = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    globalThis.SpeechSynthesisUtterance =
      FakeUtterance as unknown as typeof SpeechSynthesisUtterance;

    let hydrated = false;
    const listeners = new Map<string, () => void>();
    const valluvarVoice = [
      { name: 'Microsoft Valluvar', lang: 'ta-IN', default: false },
    ] as unknown as SpeechSynthesisVoice[];

    const mockSynth = {
      getVoices: () => (hydrated ? valluvarVoice : []),
      cancel: vi.fn(),
      speak: vi.fn((u: SpeechSynthesisUtterance) => {
        spokenUtterances.push(u as unknown as MockUtterance);
      }),
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners.set(event, cb);
      }),
      removeEventListener: vi.fn((event: string) => {
        listeners.delete(event);
      }),
    } as unknown as SpeechSynthesis;

    const cleanup = speakWithBrowserSynthesis({
      synth: mockSynth,
      cleanText: 'Good morning from Chennai',
      onStart: vi.fn(),
      onDone: vi.fn(),
    });

    expect(spokenUtterances).toHaveLength(0);
    hydrated = true;
    listeners.get('voiceschanged')?.();

    expect(spokenUtterances).toHaveLength(1);
    expect(spokenUtterances[0].voice?.name).toBe('Microsoft Valluvar');
    cleanup();
  });
});
