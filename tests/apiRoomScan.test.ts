import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as roomScanHandler } from '@/app/api/room-scan/route';
import * as geminiClientModule from '@/lib/gemini/client';
import * as groqClientModule from '@/lib/ai/groqClient';
import { NextRequest } from 'next/server';

describe('/api/room-scan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    expect(result).toHaveProperty('sceneType');
    expect(result).toHaveProperty('confidenceNote');
    expect(result).toHaveProperty('findings');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);

    // Verify findings structure
    const finding = result.findings[0];
    expect(finding).toHaveProperty('item');
    expect(finding).toHaveProperty('riskLevel');
    expect(finding).toHaveProperty('mechanism');
    expect(finding).toHaveProperty('practicalFix');
    expect(finding).toHaveProperty('estimatedCost');

    // Non-negotiable guardrails
    expect(result).toHaveProperty('sensorBoundaryNotice');
    expect(result.sensorBoundaryNotice).toMatch(/qualitative guidance/i);
    expect(result.sensorBoundaryNotice).toMatch(/physical indoor sensor/i);
    expect(result.dataKind).toBe('AI_EXPLANATION');
  });

  it('automatically fails over to Groq Vision backup when Gemini hits 429 quota exhaustion', async () => {
    // 1. Gemini throws 429 quota error
    const mockGeminiGenerate = vi.fn().mockRejectedValue({
      status: 429,
      message:
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue({
      models: { generateContent: mockGeminiGenerate },
    } as any);

    // 2. Groq Vision answers successfully
    const mockGroqCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sceneType: 'KITCHEN',
              confidenceNote: 'Analyzed kitchen exhaust setup via Groq Vision backup.',
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
            }),
          },
        },
      ],
    });

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue({
      chat: { completions: { create: mockGroqCreate } },
    } as any);

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
});
