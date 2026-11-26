import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as transcribeHandler } from '@/app/api/voice/transcribe/route';
import { POST as speakHandler } from '@/app/api/voice/speak/route';
import { detectMessageLanguage } from '@/lib/voice/speechUtils';
import { speakWithBrowserSynthesis } from '@/lib/voice/browserSpeech';
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
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const json = await res.json();

    expect(json.text).toBe('What is today AQI in Delhi?');
    expect(json.provider).toBe('groq-whisper');
    expect(mockTranscribe).toHaveBeenCalledTimes(1);
    const whisperCallArg = mockTranscribe.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(whisperCallArg).not.toHaveProperty('language');
    expect(whisperCallArg).toMatchObject({
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
    });
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
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const json = await res.json();

    expect(json.fallbackToBrowserTTS).toBe(true);
    expect(json.reason).toContain('Tamil');
  });

  it('never sends Tamil text to Groq Orpheus even when request language param is en', async () => {
    const mockSpeechCreate = vi.fn();
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqVoiceClient({ speechCreate: mockSpeechCreate })
    );

    const req = new NextRequest('http://localhost:3000/api/voice/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: 'இன்று காற்றின் தரம் எப்படி உள்ளது?',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await speakHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const json = await res.json();
    expect(json.fallbackToBrowserTTS).toBe(true);
    expect(mockSpeechCreate).not.toHaveBeenCalled();
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
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
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

describe('Bilingual Message Language Detection & Browser Synthesis', () => {
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

  afterEach(() => {
    if (originalUtterance === undefined) {
      Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
    } else {
      globalThis.SpeechSynthesisUtterance = originalUtterance;
    }
  });

  it('detectMessageLanguage detects Tamil Unicode script independently of UI state', () => {
    expect(detectMessageLanguage('சென்னையில் காற்றின் தரம் திருப்திகரமாக உள்ளது.')).toBe('ta');
    expect(detectMessageLanguage('Delhi AQI 240 — வெளியே செல்லாதீர்கள்.')).toBe('ta');
    expect(detectMessageLanguage('Avoid outdoor jogging between 6 AM and 9 AM.')).toBe('en');
    expect(detectMessageLanguage('AQI 145 PM2.5 = 73 ug/m3')).toBe('en');
  });

  it('resolves async browser voices via voiceschanged and selects ta-IN when available', async () => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    globalThis.SpeechSynthesisUtterance =
      MockUtterance as unknown as typeof SpeechSynthesisUtterance;

    let voicesLoaded = false;
    const listenerRef: { cb: (() => void) | null } = { cb: null };
    const tamilVoice = { lang: 'ta-IN', name: 'Google தமிழ்', default: false } as SpeechSynthesisVoice;
    let spokenUtterance: MockUtterance | null = null;

    const mockSynth = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => (voicesLoaded ? [tamilVoice] : [])),
      addEventListener: vi.fn((_evt: string, cb: () => void) => {
        listenerRef.cb = cb;
      }),
      removeEventListener: vi.fn(),
      speak: vi.fn((u: SpeechSynthesisUtterance) => {
        spokenUtterance = u as unknown as MockUtterance;
        spokenUtterance.onstart?.();
        spokenUtterance.onend?.();
      }),
    } as unknown as SpeechSynthesis;

    const onStart = vi.fn();
    const onDone = vi.fn();
    const onNotice = vi.fn();

    const speakPromise = speakWithBrowserSynthesis(
      mockSynth,
      'காற்றின் தரம் மிதமாக உள்ளது.',
      'ta',
      onStart,
      onDone,
      onNotice
    );

    voicesLoaded = true;
    listenerRef.cb?.();
    await speakPromise;

    expect(mockSynth.cancel).toHaveBeenCalledTimes(1);
    expect(spokenUtterance).not.toBeNull();
    const captured = spokenUtterance as MockUtterance | null;
    expect(captured?.lang).toBe('ta-IN');
    expect(captured?.voice?.lang).toBe('ta-IN');
    expect(onNotice).toHaveBeenCalledWith(null);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('emits a clear inline notice when Tamil playback finds no installed Tamil browser voice', async () => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    globalThis.SpeechSynthesisUtterance =
      MockUtterance as unknown as typeof SpeechSynthesisUtterance;

    const englishOnlyVoice = { lang: 'en-US', name: 'English US', default: true } as SpeechSynthesisVoice;
    const mockSynth = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => [englishOnlyVoice]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      speak: vi.fn((u: SpeechSynthesisUtterance) => {
        const utt = u as unknown as MockUtterance;
        utt.onend?.();
      }),
    } as unknown as SpeechSynthesis;

    const onNotice = vi.fn();
    const onDone = vi.fn();

    await speakWithBrowserSynthesis(
      mockSynth,
      'காற்றின் தரம்',
      'ta',
      vi.fn(),
      onDone,
      onNotice
    );

    expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/No Tamil browser voice/i));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
