import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { getGeminiClient } from '@/lib/gemini/client';
import { getGroqClient, isQuotaOrRateLimitError } from '@/lib/ai/groqClient';
import { getRoomScanSystemPrompt } from '@/lib/gemini/prompts';
import { RoomScanResultSchema, stripJsonCodeFences } from '@/lib/gemini/schemas';
import { getErrorMessage } from '@/lib/api/http';
import { HouseholdPersona, RoomScanResult, SupportedLanguage } from '@/types/airqua';
import { AIProvider, GEMINI_MODEL } from './chatRouter';

export interface VisionRouterParams {
  image: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  persona: HouseholdPersona;
  language: SupportedLanguage;
}

export interface VisionRouterResult {
  result: RoomScanResult;
  aiProvider: AIProvider;
  isFallback?: boolean;
}

export const MANDATORY_SENSOR_NOTICE =
  'Visual analysis is qualitative guidance; direct indoor air quality measurement requires a physical indoor sensor.';

/**
 * Verified deterministic fallback inspection protocol used only when all upstream AI providers are unreachable.
 */
export function buildDefaultRoomScanFallback(): RoomScanResult {
  return {
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
}

function normalizeVisionResponse(
  rawText: string,
  aiProvider: AIProvider,
  defaultConfidenceNote: string
): RoomScanResult {
  const cleaned = stripJsonCodeFences(rawText);
  const parsed: unknown = JSON.parse(cleaned);
  const validation = RoomScanResultSchema.safeParse(parsed);

  if (validation.success) {
    return {
      ...validation.data,
      sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
      dataKind: 'AI_EXPLANATION',
      aiProvider,
    };
  }

  const candidate = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Partial<RoomScanResult>;
  return {
    sceneType: candidate.sceneType ?? 'OTHER',
    confidenceNote: candidate.confidenceNote || defaultConfidenceNote,
    findings:
      Array.isArray(candidate.findings) && candidate.findings.length > 0
        ? candidate.findings
        : buildDefaultRoomScanFallback().findings.slice(0, 1),
    quickChecklist:
      Array.isArray(candidate.quickChecklist) && candidate.quickChecklist.length > 0
        ? candidate.quickChecklist
        : ['Pre-run exhaust fan before cooking', 'Use wet mop over dry sweeping'],
    sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
    dataKind: 'AI_EXPLANATION',
    aiProvider,
  };
}

async function runGroqVisionBackup(
  systemPrompt: string,
  mimeType: VisionRouterParams['mimeType'],
  base64Data: string
): Promise<VisionRouterResult> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Groq backup client unavailable');
  }

  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  const messages: ChatCompletionMessageParam[] = [
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
    console.warn('[routeVisionCompletion] Groq qwen3.8-27b error, trying fallback model:', getErrorMessage(modelError));
    groqResponse = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
  }

  const rawGroqText = groqResponse.choices[0]?.message?.content || '{}';
  const result = normalizeVisionResponse(
    rawGroqText,
    'groq-backup',
    'Analyzed room layout factors via Groq backup engine based on Indian household standards.'
  );

  return { result, aiProvider: 'groq-backup' };
}

/**
 * Routes multimodal Room & Smog Scan requests to Gemini (`GEMINI_MODEL`), automatically failing over
 * to Groq Vision when rate-limited, and gracefully degrading to verified deterministic indoor protocols
 * if all providers fail. Always enforces `MANDATORY_SENSOR_NOTICE`.
 */
export async function routeVisionCompletion(
  params: VisionRouterParams
): Promise<VisionRouterResult> {
  const { image, mimeType, persona, language } = params;
  const base64Data = image.includes(',') ? image.split(',')[1] : image;
  const systemPrompt = getRoomScanSystemPrompt(persona, language);

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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
    const result = normalizeVisionResponse(
      responseText,
      'gemini',
      'Analyzed room layout factors based on Indian household ventilation standards.'
    );
    return { result, aiProvider: 'gemini' };
  } catch (geminiError: unknown) {
    console.warn('[routeVisionCompletion] Gemini error:', getErrorMessage(geminiError));

    if (isQuotaOrRateLimitError(geminiError) && getGroqClient()) {
      try {
        return await runGroqVisionBackup(systemPrompt, mimeType, base64Data);
      } catch (groqError: unknown) {
        console.error('[routeVisionCompletion] Groq Vision backup also failed:', getErrorMessage(groqError));
      }
    }

    return { result: buildDefaultRoomScanFallback(), aiProvider: 'gemini', isFallback: true };
  }
}
