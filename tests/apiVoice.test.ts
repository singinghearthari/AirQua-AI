import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as transcribeHandler } from '@/app/api/voice/transcribe/route';
import { POST as speakHandler } from '@/app/api/voice/speak/route';
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
