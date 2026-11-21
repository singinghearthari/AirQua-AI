import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as transcribeHandler } from '@/app/api/voice/transcribe/route';
import { POST as speakHandler } from '@/app/api/voice/speak/route';
import * as groqClientModule from '@/lib/ai/groqClient';
import { NextRequest } from 'next/server';

describe('/api/voice/transcribe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue({
      audio: { transcriptions: { create: mockTranscribe } },
    } as any);

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
});

describe('/api/voice/speak', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue({
      audio: { speech: { create: mockSpeechCreate } },
    } as any);

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

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue({
      audio: { speech: { create: mockSpeechCreate } },
    } as any);

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
