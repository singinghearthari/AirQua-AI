import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as chatHandler } from '@/app/api/chat/route';
import { GET as getActionsHandler, POST as postActionHandler } from '@/app/api/actions/route';
import { ConsultantResponseSchema } from '@/lib/gemini/schemas';
import { stripMarkdownForSpeech } from '@/hooks/useVoiceAssistant';
import * as geminiClientModule from '@/lib/gemini/client';
import * as groqClientModule from '@/lib/ai/groqClient';
import { NextRequest } from 'next/server';

type GeminiClient = ReturnType<typeof geminiClientModule.getGeminiClient>;
type GroqClient = NonNullable<ReturnType<typeof groqClientModule.getGroqClient>>;

interface MockGeminiCallArgs {
  contents: Array<{ parts: Array<{ text?: string }> }>;
  config?: { systemInstruction?: string };
}

function asMockGeminiClient(generateContent: ReturnType<typeof vi.fn>): GeminiClient {
  return { models: { generateContent } } as unknown as GeminiClient;
}

function asMockGroqClient(create: ReturnType<typeof vi.fn>): GroqClient {
  return { chat: { completions: { create } } } as unknown as GroqClient;
}

describe('/api/chat', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects malformed JSON body with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: '{bad json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON request body/i);
  });

  it('rejects empty message with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '', persona: 'COMMUTER' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid chat parameters');
  });

  it('rejects messages longer than 800 characters with status 400', async () => {
    const longMessage = 'a'.repeat(801);
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage, persona: 'FAMILY_KIDS' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects history exceeding 6 turns with status 400', async () => {
    const excessiveHistory = Array.from({ length: 7 }, (_, i) => ({
      role: 'user' as const,
      text: `Turn ${i}`,
    }));

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What should I do now?',
        persona: 'SENIOR',
        history: excessiveHistory,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(400);
  });

  it('returns distinct answers directly tailored to different questions (no repetitive canned responses)', async () => {
    const mockGenerate = vi.fn().mockImplementation(async ({ contents }: MockGeminiCallArgs) => {
      const userMessage = contents[contents.length - 1]?.parts[0]?.text || '';

      if (userMessage.includes('cooking smoke')) {
        return {
          text: JSON.stringify({
            answer:
              'To reduce cooking smoke, run your exhaust fan on high throughout frying and keep kitchen doors closed.',
            whyItMatters:
              'Cooking oils at high temperatures release concentrated ultrafine PM2.5 and VOCs that degrade indoor air.',
            recommendedActions: [
              {
                title: 'Run kitchen exhaust fan on high during tadka',
                category: 'INDOOR',
                effort: 'QUICK',
              },
            ],
            followUpPrompts: [
              'How long should the exhaust run after cooking?',
              'Will a HEPA purifier remove oil smoke odors?',
            ],
            provenanceTags: ['AI Guidance'],
          }),
        };
      }

      // Default outdoor / walk question response
      return {
        text: JSON.stringify({
          answer:
            'In Delhi with an AQI of 240 (IN_CPCB), shift your walk to the safe window between 13:00 and 15:00.',
          whyItMatters:
            'Morning thermal inversion traps fine particulate pollution near the surface, increasing cardiovascular strain.',
          recommendedActions: [
            {
              title: 'Shift walking to 13:00–15:00 safe window',
              category: 'EXPOSURE',
              effort: 'HABIT',
            },
          ],
          followUpPrompts: [
            'Is it safe to do indoor yoga instead?',
            'Should I wear an N95 mask outdoors today?',
          ],
          provenanceTags: ['Observed/Modeled', 'AI Guidance'],
        }),
      };
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    // Question 1: Outdoor walking
    const reqWalk = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'When should I go for my morning walk?',
        persona: 'SENIOR',
        language: 'en',
        snapshot: {
          location: { name: 'Delhi' },
          scale: 'IN_CPCB',
          aqiValue: 240,
          aqiCategory: 'Poor',
          observedAt: new Date().toISOString(),
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const resWalk = await chatHandler(reqWalk);
    expect(resWalk.status).toBe(200);
    const jsonWalk = await resWalk.json();

    // Question 2: Kitchen cooking smoke
    const reqSmoke = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'How do I reduce cooking smoke in my kitchen?',
        persona: 'FAMILY_KIDS',
        language: 'en',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const resSmoke = await chatHandler(reqSmoke);
    expect(resSmoke.status).toBe(200);
    const jsonSmoke = await resSmoke.json();

    // Verify distinct answers
    expect(jsonWalk.reply).toContain('walk');
    expect(jsonSmoke.reply).toContain('cooking smoke');
    expect(jsonWalk.reply).not.toEqual(jsonSmoke.reply);

    // Verify schema adherence
    const parsedWalk = ConsultantResponseSchema.safeParse(jsonWalk.structured);
    expect(parsedWalk.success).toBe(true);
    const parsedSmoke = ConsultantResponseSchema.safeParse(jsonSmoke.structured);
    expect(parsedSmoke.success).toBe(true);
  });

  it('supports cross-screen context injection (Room Scan & Simulator Routines)', async () => {
    let capturedSystemInstruction = '';
    const mockGenerate = vi.fn().mockImplementation(async ({ config }: MockGeminiCallArgs) => {
      capturedSystemInstruction = config?.systemInstruction || '';
      return {
        text: JSON.stringify({
          answer:
            'Based on your kitchen scan showing an unvented gas stove, prioritize isolating the kitchen.',
          whyItMatters:
            'Unvented combustion releases toxic nitrogen dioxide and fine particles into living areas.',
          recommendedActions: [
            {
              title: 'Keep kitchen doors shut and run exhaust fan',
              category: 'INDOOR',
              effort: 'QUICK',
            },
          ],
          followUpPrompts: [
            'Should I install a kitchen chimney?',
            'How effective are window exhaust fans?',
          ],
          provenanceTags: ['AI Guidance'],
        }),
      };
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'How should I protect my kids during dinner prep?',
        persona: 'FAMILY_KIDS',
        language: 'en',
        snapshot: {
          location: { name: 'Delhi' },
          scale: 'IN_CPCB',
          aqiValue: 310,
          aqiCategory: 'Very Poor',
        },
        latestRoomScanSummary: 'Kitchen inspection: Gas stove without visible exhaust',
        activeSimulatorSwaps: ['KITCHEN_VENTILATION', 'SHIFT_OUTDOOR_TO_SAFE_WINDOW'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('structured');
    const parseResult = ConsultantResponseSchema.safeParse(json.structured);
    expect(parseResult.success).toBe(true);

    // Verify cross-screen context was forwarded into Gemini prompt
    expect(capturedSystemInstruction).toContain('Kitchen inspection: Gas stove without visible exhaust');
    expect(capturedSystemInstruction).toContain('KITCHEN_VENTILATION');
  });

  it('supports Tamil language parameter without errors and returns structured response', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        answer:
          'சென்னையில் தற்போதைய காற்று தரம் 85 (திருப்திகரமானது). மாலை நேரங்களில் வெளிப்புற பணிகளை பாதுகாப்பாக செய்யலாம்.',
        whyItMatters: 'குறைந்த காற்று மாசு அளவு காரணமாக வெளிப்புற நடமாட்டம் பாதுகாப்பானது.',
        recommendedActions: [
          {
            title: 'பாதுகாப்பான நேரத்தில் வெளிப்புற பணிகளை திட்டமிடுங்கள்',
            category: 'EXPOSURE',
            effort: 'HABIT',
          },
        ],
        followUpPrompts: [
          'இன்றைய சிறந்த காற்றோட்ட நேரம் எது?',
          'வீட்டு காற்று சுத்திகரிப்பான் தேவையா?',
        ],
        provenanceTags: ['AI Guidance'],
      }),
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'இன்று நான் வெளியே செல்லலாமா?',
        persona: 'FAMILY_KIDS',
        language: 'ta',
        snapshot: {
          location: { name: 'Chennai' },
          scale: 'IN_CPCB',
          aqiValue: 85,
          aqiCategory: 'Satisfactory',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('reply');
    expect(typeof json.reply).toBe('string');
    expect(json.reply).toContain('சென்னையில்');
    expect(json).toHaveProperty('structured');
    const parseResult = ConsultantResponseSchema.safeParse(json.structured);
    expect(parseResult.success).toBe(true);
  });

  it('strips markdown code fences from Gemini JSON output gracefully', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      text: '```json\n{"answer":"Properly stripped markdown fences.","whyItMatters":"Mechanism.","recommendedActions":[{"title":"Action 1","category":"INDOOR","effort":"QUICK"}],"followUpPrompts":["Q1","Q2"],"provenanceTags":["AI Guidance"]}\n```',
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Check code fence handling',
        persona: 'COMMUTER',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe('Properly stripped markdown fences.');
  });

  it('automatically fails over to Groq backup when Gemini hits 429 quota exhaustion', async () => {
    // 1. Gemini throws 429 quota exhausted
    const mockGeminiGenerate = vi.fn().mockRejectedValue({
      status: 429,
      message:
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGeminiGenerate)
    );

    // 2. Groq answers seamlessly
    const mockGroqCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: 'Response generated via Groq backup engine during high traffic.',
              whyItMatters: 'Automatic failover maintains real-time air quality advice.',
              recommendedActions: [
                {
                  title: 'Shift outdoor run to 13:00 safe window',
                  category: 'EXPOSURE',
                  effort: 'HABIT',
                },
              ],
              followUpPrompts: ['What is the best afternoon route?'],
              provenanceTags: ['AI Guidance'],
            }),
          },
        },
      ],
    });

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqClient(mockGroqCreate)
    );

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Is it safe to run outside?',
        persona: 'STUDENT_ATHLETE',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.aiProvider).toBe('groq-backup');
    expect(json.reply).toContain('Groq backup engine');
    const parseResult = ConsultantResponseSchema.safeParse(json.structured);
    expect(parseResult.success).toBe(true);
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });

  it('returns status 429 when both Gemini and Groq quota are exceeded', async () => {
    const mockGenerate = vi.fn().mockRejectedValue({
      status: 429,
      message:
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
    });

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    // Groq client is null or fails
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(null);

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is today AQI?',
        persona: 'FAMILY_KIDS',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('GEMINI_QUOTA_EXCEEDED');
    expect(json.error).toMatch(/quota exceeded/i);
  });

  it('returns status 502 when AI providers fail due to server error or network failure', async () => {
    const mockGenerate = vi
      .fn()
      .mockRejectedValue(new Error('Upstream provider returned an unrecoverable server error'));

    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGenerate)
    );

    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(null);

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is today AQI?',
        persona: 'FAMILY_KIDS',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe('GEMINI_ERROR');
    expect(json.error).toMatch(/could not reach/i);
  });

  it('fails over to Groq backup when Gemini throws a transient timeout', async () => {
    const mockGeminiTimeout = vi.fn().mockRejectedValue(new Error('Request deadline timeout exceeded'));
    vi.spyOn(geminiClientModule, 'getGeminiClient').mockReturnValue(
      asMockGeminiClient(mockGeminiTimeout)
    );

    const mockGroqCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: 'Recovered via Groq after upstream Gemini timeout.',
              whyItMatters: 'Failover keeps family protection guidance responsive.',
              recommendedActions: [
                { title: 'Close street-facing windows', category: 'INDOOR', effort: 'QUICK' },
              ],
              followUpPrompts: ['What is the next safe window?'],
              provenanceTags: ['AI Guidance'],
            }),
          },
        },
      ],
    });
    vi.spyOn(groqClientModule, 'getGroqClient').mockReturnValue(
      asMockGroqClient(mockGroqCreate)
    );

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Should we keep windows closed tonight?',
        persona: 'FAMILY_KIDS',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.aiProvider).toBe('groq-backup');
    expect(json.reply).toContain('Recovered via Groq');
  });

  it('enforces per-IP rate limiting with status 429 after 15 requests per minute', async () => {
    const ip = '198.51.100.22';
    for (let i = 0; i < 15; i++) {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      });
      await chatHandler(req);
    }

    const blockedReq = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    });
    const blockedRes = await chatHandler(blockedReq);
    expect(blockedRes.status).toBe(429);
  });
});

describe('Voice Assistant speech sanitizer', () => {
  it('strips markdown syntax cleanly for natural Web Speech readout', () => {
    const markdownSample =
      '**Warning:** Heavy *PM2.5* pollution! Visit [CPCB Portal](https://cpcb.nic.in).\n\n• Use `HEPA` purifier.\n# High Alert';
    const spokenText = stripMarkdownForSpeech(markdownSample);

    expect(spokenText).not.toContain('**');
    expect(spokenText).not.toContain('*');
    expect(spokenText).not.toContain('`');
    expect(spokenText).not.toContain('#');
    expect(spokenText).not.toContain('•');
    expect(spokenText).not.toContain('https://');
    expect(spokenText).toContain('Warning: Heavy PM2.5 pollution! Visit CPCB Portal');
    expect(spokenText).toContain('Use HEPA purifier');
  });
});

describe('/api/actions', () => {
  it('handles guest mode gracefully without requiring authorization tokens', async () => {
    const getReq = new NextRequest('http://localhost:3000/api/actions');
    const getRes = await getActionsHandler(getReq);
    expect(getRes.status).toBe(200);

    const getJson = await getRes.json();
    expect(getJson.mode).toBe('GUEST');

    const postReq = new NextRequest('http://localhost:3000/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        headline: 'Kitchen Exhaust Action',
        action: 'Run exhaust fan during tadka frying',
        period: 'MORNING',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const postRes = await postActionHandler(postReq);
    expect(postRes.status).toBe(200);

    const postJson = await postRes.json();
    expect(postJson.mode).toBe('GUEST');
    expect(postJson.saved).toBe(true);
    expect(postJson.action).toHaveProperty('headline', 'Kitchen Exhaust Action');
  });
});
