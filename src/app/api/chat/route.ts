import { NextRequest } from 'next/server';
import { z } from 'zod';
import { routeChatCompletion } from '@/lib/ai/providerRouter';
import { isQuotaOrRateLimitError } from '@/lib/ai/groqClient';
import {
  enforceRateLimit,
  getErrorMessage,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/api/http';
import {
  AirQualitySnapshot,
  HouseholdPersona,
  SafeWindowSummary,
  SupportedLanguage,
} from '@/types/airqua';

export const runtime = 'nodejs';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().max(2000),
});

const ChatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(800, 'Message cannot exceed 800 characters'),
  history: z
    .array(ChatMessageSchema)
    .max(6, 'Maximum 6 history turns allowed')
    .optional()
    .default([]),
  persona: z
    .enum(['COMMUTER', 'FAMILY_KIDS', 'SENIOR', 'STUDENT_ATHLETE'])
    .optional()
    .default('FAMILY_KIDS'),
  language: z.enum(['en', 'ta']).optional().default('en'),
  snapshot: z.custom<AirQualitySnapshot | null>().optional(),
  safeWindows: z.custom<SafeWindowSummary | null>().optional(),
  latestRoomScanSummary: z.string().optional(),
  activeSimulatorSwaps: z.array(z.string()).optional(),
});

/**
 * Handles bilingual AI Consultant requests grounded in verified live telemetry.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(
    request,
    15,
    60 * 1000,
    'Too many messages sent. Please wait before asking another question.'
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBody(request, ChatRequestSchema, 'Invalid chat parameters');
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const {
    message,
    history,
    persona,
    language,
    snapshot,
    safeWindows,
    latestRoomScanSummary,
    activeSimulatorSwaps,
  } = parsed.data;

  try {
    const result = await routeChatCompletion({
      message,
      history: history ?? [],
      persona: persona as HouseholdPersona,
      language: language as SupportedLanguage,
      snapshot,
      safeWindows,
      latestRoomScanSummary,
      activeSimulatorSwaps,
    });

    return jsonOk({
      reply: result.reply,
      structured: result.structured,
      provenance: result.provenance,
      aiProvider: result.aiProvider,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[api/chat] error:', error);

    if (isQuotaOrRateLimitError(error)) {
      return jsonError(
        'AI quota exceeded on both Gemini and Groq backup. Please check API quotas or wait before asking another question.',
        429,
        { code: 'GEMINI_QUOTA_EXCEEDED' }
      );
    }

    return jsonError(
      'AI Consultant could not reach AI providers. Check server configuration and logs.',
      502,
      {
        code: 'GEMINI_ERROR',
        details:
          process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      }
    );
  }
}
