import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as roomScanHandler } from '@/app/api/room-scan/route';
import * as geminiClientModule from '@/lib/gemini/client';
import * as groqClientModule from '@/lib/ai/groqClient';
import { NextRequest } from 'next/server';

type GeminiClient = ReturnType<typeof geminiClientModule.getGeminiClient>;
type GroqClient = NonNullable<ReturnType<typeof groqClientModule.getGroqClient>>;

function asMockGeminiClient(generateContent: ReturnType<typeof vi.fn>): GeminiClient {
  return { models: { generateContent } } as unknown as GeminiClient;
}

function asMockGroqClient(create: ReturnType<typeof vi.fn>): GroqClient {
  return { chat: { completions: { create } } } as unknown as GroqClient;
}

const VALID_SAMPLE_RESULT = {
  sceneType: 'KITCHEN',
  confidenceNote: 'Detected gas stove without active exhaust hood.',
  findings: [
    {
      item: 'Unvented Gas Cooktop Emissions',
      riskLevel: 'HIGH',
      mechanism: 'Unvented cooking oil releases ultrafine particles.',
      practicalFix: 'Run exhaust fan on high during cooking.',
      estimatedCost: 'FREE',
    },
  ],
  quickChecklist: ['Run exhaust fan', 'Use wet mop'],
  sensorBoundaryNotice:
    'Visual analysis is qualitative guidance; direct indoor air quality measurement requires a physical indoor sensor.',
  dataKind: 'AI_EXPLANATION',
};

describe('/api/room-scan', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects malformed JSON body with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: '{invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON request body/i);
  });

  it('rejects missing body with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid room scan payload');
  });

  it('rejects unsupported image MIME types with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({
        image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        mimeType: 'image/gif',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects payload exceeding the 4 MB limit with status 413', async () => {
    // Generate a simulated base64 string larger than 4 MB
    // 4 MB = 4 * 1024 * 1024 = 4,194,304 bytes -> base64 length is approx 5,592,405 chars
    const largeBase64 = Buffer.alloc(4.2 * 1024 * 1024, 'a').toString('base64');

    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({
        image: largeBase64,
        mimeType: 'image/jpeg',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toMatch(/exceeds the 4 MB limit/i);
  });

  it('processes valid image payload and returns result with mandatory sensorBoundaryNotice', async () => {
    const mockGeminiGenerate = vi.fn().mockResolvedValue({
      text: JSON.stringify(VALID_SAMPLE_RESULT),
    });
    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGeminiGenerate)
    );

    // 1x1 valid transparent PNG base64
    const validPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({
        image: validPng,
        mimeType: 'image/png',
        persona: 'FAMILY_KIDS',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('result');
    const { result } = json;

    expect(result.aiProvider).toBe('gemini');
    expect(result).toHaveProperty('sceneType');
    expect(result).toHaveProperty('confidenceNote');
    expect(result).toHaveProperty('findings');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);

    const finding = result.findings[0];
    expect(finding).toHaveProperty('item');
    expect(finding).toHaveProperty('riskLevel');
    expect(finding).toHaveProperty('mechanism');
    expect(finding).toHaveProperty('practicalFix');
    expect(finding).toHaveProperty('estimatedCost');

    expect(result).toHaveProperty('sensorBoundaryNotice');
    expect(result.sensorBoundaryNotice).toMatch(/qualitative guidance/i);
    expect(result.sensorBoundaryNotice).toMatch(/physical indoor sensor/i);
    expect(result.dataKind).toBe('AI_EXPLANATION');
  });

  it('automatically fails over to Groq Vision backup when Gemini hits 429 quota exhaustion', async () => {
    const mockGeminiGenerate = vi.fn().mockRejectedValue({
      status: 429,
      message:
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
    });
    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGeminiGenerate)
    );

    const mockGroqCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(VALID_SAMPLE_RESULT) } }],
    });
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqClient(mockGroqCreate)
    );

    const validPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({
        image: validPng,
        mimeType: 'image/png',
        persona: 'FAMILY_KIDS',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.result.aiProvider).toBe('groq-backup');
    expect(json.result.sceneType).toBe('KITCHEN');
    expect(json.result.findings.length).toBeGreaterThan(0);
    expect(json.result.sensorBoundaryNotice).toMatch(/qualitative guidance/i);
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });

  it('fails over to Groq Vision when Gemini times out and degrades cleanly when both fail', async () => {
    const validPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const mockGeminiTimeout = vi
      .fn()
      .mockRejectedValue(new Error('RESOURCE_EXHAUSTED: deadline exceeded timeout'));
    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGeminiTimeout)
    );

    const mockGroqFail = vi.fn().mockRejectedValue(new Error('Groq Vision offline'));
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(asMockGroqClient(mockGroqFail));

    const req = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({
        image: validPng,
        mimeType: 'image/png',
        persona: 'SENIOR',
        language: 'ta',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await roomScanHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Airqua-Fallback')).toBe('true');
    const json = await res.json();
    expect(json.isFallback).toBe(true);
    expect(mockGeminiTimeout).toHaveBeenCalledTimes(1);
    expect(mockGroqFail).toHaveBeenCalledTimes(2);
    expect(json.result.sceneType).toBe('OTHER');
    expect(json.result.findings.length).toBeGreaterThanOrEqual(1);
    expect(json.result.sensorBoundaryNotice).toMatch(/qualitative guidance/i);
  });

  it('enforces per-IP rate limiting with status 429 after 10 requests per minute', async () => {
    const ip = '198.51.100.11';
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost:3000/api/room-scan', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      });
      await roomScanHandler(req);
    }

    const blockedReq = new NextRequest('http://localhost:3000/api/room-scan', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    });
    const blockedRes = await roomScanHandler(blockedReq);
    expect(blockedRes.status).toBe(429);
  });
});
