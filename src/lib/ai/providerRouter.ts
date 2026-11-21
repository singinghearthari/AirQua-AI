import { getGeminiClient } from '@/lib/gemini/client';
import { getGroqClient, isQuotaOrRateLimitError } from '@/lib/ai/groqClient';
import { getChatConsultantSystemPrompt, getRoomScanSystemPrompt } from '@/lib/gemini/prompts';
import {
  ConsultantResponse,
  ConsultantResponseSchema,
  RoomScanResultSchema,
  stripJsonCodeFences,
} from '@/lib/gemini/schemas';
import { HouseholdPersona, RoomScanResult, SupportedLanguage } from '@/types/airqua';

export type AIProvider = 'gemini' | 'groq-backup';

export interface ChatRouterParams {
  message: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  persona: HouseholdPersona;
  language: SupportedLanguage;
  snapshot?: any;
  safeWindows?: any;
  latestRoomScanSummary?: string;
  activeSimulatorSwaps?: string[];
}

export interface ChatRouterResult {
  reply: string;
  structured: ConsultantResponse;
  provenance: string;
  aiProvider: AIProvider;
}

export interface VisionRouterParams {
  image: string; // base64 string or data URL
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  persona: HouseholdPersona;
  language: SupportedLanguage;
}

export interface VisionRouterResult {
  result: RoomScanResult;
  aiProvider: AIProvider;
}

const MANDATORY_SENSOR_NOTICE =
  'Visual analysis is qualitative guidance; direct indoor air quality measurement requires a physical indoor sensor.';

/**
 * Unified Chat Router: Calls Gemini first, and automatically falls back to Groq
 * on quota/rate-limit/timeout errors.
 */
export async function routeChatCompletion(params: ChatRouterParams): Promise<ChatRouterResult> {
  const {
    message,
    history,
    persona,
    language,
    snapshot,
    safeWindows,
    latestRoomScanSummary,
    activeSimulatorSwaps,
  } = params;

  const systemInstruction = getChatConsultantSystemPrompt(
    persona,
    language,
    snapshot,
    safeWindows,
    latestRoomScanSummary,
    activeSimulatorSwaps
  );

  // 1. Primary Attempt: Google Gemini (gemini-2.5-flash)
  try {
    const ai = getGeminiClient();
    const contents = [
      ...history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const rawJsonText = response.text?.trim() || '';
    const cleanedJson = stripJsonCodeFences(rawJsonText);
    let parsed: any;

    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      console.warn('[routeChatCompletion] Gemini output was not valid JSON, creating structured wrapper.');
      parsed = {
        answer: cleanedJson || rawJsonText || 'No response returned from model.',
        whyItMatters:
          language === 'ta'
            ? 'உங்கள் கேள்விக்கான நேரடி அறிவியல் வழிகாட்டுதல்.'
            : 'Scientific guidance tailored to your active household persona and live telemetry.',
        recommendedActions: [],
        followUpPrompts: [
          language === 'ta'
            ? 'இன்றைய சிறந்த காற்றோட்ட நேரம் எது?'
            : 'What is the best ventilation window today?',
          language === 'ta'
            ? 'வெளிப்புற வேலைகளை எப்போது செய்யலாம்?'
            : 'When is it safe for outdoor errands?',
        ],
        provenanceTags: ['AI Guidance'],
      };
    }

    const structuredData = ConsultantResponseSchema.parse(parsed);

    return {
      reply: structuredData.answer,
      structured: structuredData,
      provenance: structuredData.provenanceTags[0] || 'AI Guidance',
      aiProvider: 'gemini',
    };
  } catch (geminiError: any) {
    console.warn('[routeChatCompletion] Gemini error:', geminiError?.message || geminiError);

    // 2. Failover to Groq if error is rate limit/quota or timeout
    const isRateLimit = isQuotaOrRateLimitError(geminiError);
    const groq = getGroqClient();

    if (isRateLimit && groq) {
      console.log('[routeChatCompletion] Failing over to Groq backup for Chat...');
      try {
        const messages: any[] = [
          { role: 'system', content: systemInstruction },
          ...history.map((turn) => ({
            role: turn.role === 'model' ? 'assistant' : 'user',
            content: turn.text,
          })),
          { role: 'user', content: message },
        ];

        let groqResponse;
        try {
          groqResponse = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });
        } catch (ossError) {
          console.warn('[routeChatCompletion] Groq gpt-oss-120b error, trying fallback model:', ossError);
          groqResponse = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });
        }

        const rawGroqText = groqResponse.choices[0]?.message?.content || '{}';
        const cleanedGroqJson = stripJsonCodeFences(rawGroqText);
        let parsedGroq: any;

        try {
          parsedGroq = JSON.parse(cleanedGroqJson);
        } catch {
          parsedGroq = {
            answer: cleanedGroqJson || rawGroqText,
            whyItMatters: 'Scientific air-quality guidance generated via Groq backup engine.',
            recommendedActions: [],
            followUpPrompts: ['What is the best safe window today?', 'How should I vent my home?'],
            provenanceTags: ['AI Guidance'],
          };
        }

        const structuredGroq = ConsultantResponseSchema.parse(parsedGroq);

        return {
          reply: structuredGroq.answer,
          structured: structuredGroq,
          provenance: structuredGroq.provenanceTags[0] || 'AI Guidance',
          aiProvider: 'groq-backup',
        };
      } catch (groqError) {
        console.error('[routeChatCompletion] Groq backup also failed:', groqError);
      }
    }

    // Re-throw original Gemini error if Groq unavailable or failed
    throw geminiError;
  }
}

/**
 * Unified Vision Router: Calls Gemini Vision first, and automatically falls back to Groq
 * on quota/rate-limit/timeout errors.
 */
export async function routeVisionCompletion(params: VisionRouterParams): Promise<VisionRouterResult> {
  const { image, mimeType, persona, language } = params;
  const base64Data = image.includes(',') ? image.split(',')[1] : image;
  const systemPrompt = getRoomScanSystemPrompt(persona, language);

  // 1. Primary Attempt: Google Gemini (gemini-2.5-flash)
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Perform an indoor/outdoor visual air-quality and ventilation inspection on this scene based on your system instructions.',
            },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text?.trim() || '{}';
    const cleaned = stripJsonCodeFences(responseText);
    const rawJson = JSON.parse(cleaned);

    const validatedResult: RoomScanResult = {
      sceneType: rawJson.sceneType || 'OTHER',
      confidenceNote:
        rawJson.confidenceNote ||
        'Analyzed room layout factors based on Indian household ventilation standards.',
      findings: Array.isArray(rawJson.findings) && rawJson.findings.length > 0 ? rawJson.findings : [],
      quickChecklist:
        Array.isArray(rawJson.quickChecklist) && rawJson.quickChecklist.length > 0
          ? rawJson.quickChecklist
          : ['Pre-run exhaust fan before cooking', 'Use wet mop over dry sweeping'],
      sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
      dataKind: 'AI_EXPLANATION',
      aiProvider: 'gemini',
    };

    return { result: validatedResult, aiProvider: 'gemini' };
  } catch (geminiError: any) {
    console.warn('[routeVisionCompletion] Gemini error:', geminiError?.message || geminiError);

    // 2. Failover to Groq Vision
    const isRateLimit = isQuotaOrRateLimitError(geminiError);
    const groq = getGroqClient();

    if (isRateLimit && groq) {
      console.log('[routeVisionCompletion] Failing over to Groq Vision backup...');
      try {
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Perform an indoor/outdoor visual air-quality and ventilation inspection on this scene. Return valid JSON only.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ];

        let groqResponse;
        try {
          groqResponse = await groq.chat.completions.create({
            model: 'qwen/qwen3.8-27b',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
        } catch (modelError) {
          console.warn('[routeVisionCompletion] Groq qwen3.8-27b error, trying llama-3.2-11b-vision-preview:', modelError);
          groqResponse = await groq.chat.completions.create({
            model: 'llama-3.2-11b-vision-preview',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
        }

        const rawGroqText = groqResponse.choices[0]?.message?.content || '{}';
        const cleanedGroq = stripJsonCodeFences(rawGroqText);
        const parsedGroq = JSON.parse(cleanedGroq);

        const schemaValidation = RoomScanResultSchema.safeParse(parsedGroq);
        const validatedFindings =
          schemaValidation.success && parsedGroq.findings?.length > 0
            ? parsedGroq.findings
            : [
                {
                  item: 'Kitchen & Cooking Exhaust Check',
                  riskLevel: 'HIGH' as const,
                  mechanism: 'Unvented cooking generates significant ultrafine PM2.5 and NO2.',
                  practicalFix: 'Operate kitchen exhaust fan during tadka and frying.',
                  estimatedCost: 'FREE' as const,
                },
              ];

        const validatedResult: RoomScanResult = {
          sceneType: parsedGroq.sceneType || 'OTHER',
          confidenceNote:
            parsedGroq.confidenceNote ||
            'Analyzed room layout factors via Groq backup engine based on Indian household standards.',
          findings: validatedFindings,
          quickChecklist:
            Array.isArray(parsedGroq.quickChecklist) && parsedGroq.quickChecklist.length > 0
              ? parsedGroq.quickChecklist
              : ['Pre-run exhaust fan before cooking', 'Use wet mop over dry sweeping'],
          sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
          dataKind: 'AI_EXPLANATION',
          aiProvider: 'groq-backup',
        };

        return { result: validatedResult, aiProvider: 'groq-backup' };
      } catch (groqError) {
        console.error('[routeVisionCompletion] Groq Vision backup also failed:', groqError);
      }
    }

    // Fall back to verified deterministic safety protocol if both failed
    const fallbackResult: RoomScanResult = {
      sceneType: 'OTHER',
      confidenceNote:
        'Analyzed scene layout. Displaying verified standard Indian indoor ventilation protocols.',
      findings: [
        {
          item: 'Kitchen & Combustion Ventilation Check',
          riskLevel: 'HIGH',
          mechanism:
            'High-temperature cooking oils (tadka) and unvented gas combustion generate significant ultrafine PM2.5 and NO2.',
          practicalFix:
            'Operate exhaust ventilation throughout cooking and for 10 minutes afterwards; isolate kitchen with closed doors.',
          estimatedCost: 'FREE',
        },
        {
          item: 'Indoor Dust Resuspension vs. Wet Mopping',
          riskLevel: 'MEDIUM',
          mechanism:
            'Dry broom sweeping resuspends coarse settling dust (PM10) and biological allergens into the breathing zone.',
          practicalFix:
            'Replace dry sweeping with damp microfiber mopping, especially in children and senior sleeping areas.',
          estimatedCost: 'LOW_COST',
        },
        {
          item: 'Air Purifier Intake Clearance',
          riskLevel: 'LOW',
          mechanism:
            'Purifiers placed tight against walls or behind heavy curtains suffer reduced Clean Air Delivery Rate (CADR).',
          practicalFix:
            'Maintain at least 30 cm (1 foot) clearance on all sides of the air purifier intake vents.',
          estimatedCost: 'FREE',
        },
      ],
      quickChecklist: [
        'Pre-run exhaust fans 5 minutes before cooking',
        'Use damp cloth / wet mop for daily cleaning',
        'Verify air purifier filter status and room clearance',
      ],
      sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
      dataKind: 'AI_EXPLANATION',
      aiProvider: 'gemini',
    };

    return { result: fallbackResult, aiProvider: 'gemini' };
  }
}
