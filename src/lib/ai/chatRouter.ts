import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { getGeminiClient } from '@/lib/gemini/client';
import { getGroqClient, isQuotaOrRateLimitError } from '@/lib/ai/groqClient';
import { getChatConsultantSystemPrompt } from '@/lib/gemini/prompts';
import {
  ConsultantResponse,
  ConsultantResponseSchema,
  stripJsonCodeFences,
} from '@/lib/gemini/schemas';
import { getErrorMessage } from '@/lib/api/http';
import {
  AirQualitySnapshot,
  HouseholdPersona,
  SafeWindowSummary,
  SupportedLanguage,
} from '@/types/airqua';

export type AIProvider = 'gemini' | 'groq-backup';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export interface ChatRouterParams {
  message: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  persona: HouseholdPersona;
  language: SupportedLanguage;
  snapshot?: AirQualitySnapshot | null;
  safeWindows?: SafeWindowSummary | null;
  latestRoomScanSummary?: string;
  activeSimulatorSwaps?: string[];
}

export interface ChatRouterResult {
  reply: string;
  structured: ConsultantResponse;
  provenance: string;
  aiProvider: AIProvider;
}

function buildPlainTextFallbackPayload(
  rawText: string,
  language: SupportedLanguage,
  sourceNote: string
): Record<string, unknown> {
  return {
    answer: rawText || 'No response returned from model.',
    whyItMatters:
      language === 'ta'
        ? 'உங்கள் கேள்விக்கான நேரடி அறிவியல் வழிகாட்டுதல்.'
        : sourceNote,
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

function parseConsultantPayload(
  rawText: string,
  language: SupportedLanguage,
  sourceNote: string
): ConsultantResponse {
  const cleaned = stripJsonCodeFences(rawText);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn(
      '[chatRouter] Model response was not valid JSON, normalizing as plain-text response:',
      getErrorMessage(parseErr)
    );
    parsed = buildPlainTextFallbackPayload(cleaned || rawText, language, sourceNote);
  }

  return ConsultantResponseSchema.parse(parsed);
}

async function runGroqChatBackup(
  systemInstruction: string,
  params: ChatRouterParams
): Promise<ChatRouterResult> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Groq backup client unavailable');
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemInstruction },
    ...params.history.map((turn): ChatCompletionMessageParam => ({
      role: turn.role === 'model' ? 'assistant' : 'user',
      content: turn.text,
    })),
    { role: 'user', content: params.message },
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
    console.warn('[routeChatCompletion] Groq primary model error, falling back:', getErrorMessage(ossError));
    groqResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
  }

  const rawGroqText = groqResponse.choices[0]?.message?.content || '{}';
  const structuredGroq = parseConsultantPayload(
    rawGroqText,
    params.language,
    'Scientific air-quality guidance generated via Groq backup engine.'
  );

  return {
    reply: structuredGroq.answer,
    structured: structuredGroq,
    provenance: structuredGroq.provenanceTags[0] || 'AI Guidance',
    aiProvider: 'groq-backup',
  };
}

/**
 * Routes bilingual AI Consultant chat requests to Gemini (`GEMINI_MODEL`) first,
 * and transparently fails over to Groq when quota, rate-limit, overload, or timeout errors occur.
 *
 * @throws Re-throws the original Gemini error if Groq failover is ineligible or fails.
 */
export async function routeChatCompletion(params: ChatRouterParams): Promise<ChatRouterResult> {
  const systemInstruction = getChatConsultantSystemPrompt(
    params.persona,
    params.language,
    params.snapshot,
    params.safeWindows,
    params.latestRoomScanSummary,
    params.activeSimulatorSwaps
  );

  try {
    const ai = getGeminiClient();
    const contents = [
      ...params.history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      {
        role: 'user',
        parts: [{ text: params.message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const rawJsonText = response.text?.trim() || '';
    const structuredData = parseConsultantPayload(
      rawJsonText,
      params.language,
      'Scientific guidance tailored to your active household persona and live telemetry.'
    );

    return {
      reply: structuredData.answer,
      structured: structuredData,
      provenance: structuredData.provenanceTags[0] || 'AI Guidance',
      aiProvider: 'gemini',
    };
  } catch (geminiError: unknown) {
    console.warn('[routeChatCompletion] Gemini error:', getErrorMessage(geminiError));

    if (isQuotaOrRateLimitError(geminiError) && getGroqClient()) {
      try {
        return await runGroqChatBackup(systemInstruction, params);
      } catch (groqError: unknown) {
        console.error('[routeChatCompletion] Groq backup also failed:', getErrorMessage(groqError));
      }
    }

    throw geminiError;
  }
}
