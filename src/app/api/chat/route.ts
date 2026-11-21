import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeChatCompletion } from '@/lib/ai/providerRouter';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { HouseholdPersona, SupportedLanguage } from '@/types/airqua';

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
  snapshot: z.any().optional(),
  safeWindows: z.any().optional(),
  latestRoomScanSummary: z.string().optional(),
  activeSimulatorSwaps: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (15 requests per minute per client)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const rateCheck = checkRateLimit(clientIp, 15, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Too many messages sent. Please wait before asking another question.',
        retryAfterSec: rateCheck.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': rateCheck.retryAfterSec.toString() },
      }
    );
  }

  // 2. Body parsing & Zod validation
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parseResult = ChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid chat parameters', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const {
    message,
    history,
    persona,
    language,
    snapshot,
    safeWindows,
    latestRoomScanSummary,
    activeSimulatorSwaps,
  } = parseResult.data;

  // 3. Call Unified AI Router (Gemini primary -> Groq backup)
  try {
    const result = await routeChatCompletion({
      message,
      history,
      persona: persona as HouseholdPersona,
      language: language as SupportedLanguage,
      snapshot,
      safeWindows,
      latestRoomScanSummary,
      activeSimulatorSwaps,
    });

    return NextResponse.json({
      reply: result.reply,
      structured: result.structured,
      provenance: result.provenance,
      aiProvider: result.aiProvider,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[api/chat] error:', error);

    const errorMessage = error?.message || String(error);
    const isRateLimit =
      error?.status === 429 ||
      errorMessage.includes('429') ||
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.toLowerCase().includes('resource_exhausted');

    if (isRateLimit) {
      return NextResponse.json(
        {
          error:
            'AI quota exceeded on both Gemini and Groq backup. Please check API quotas or wait before asking another question.',
          code: 'GEMINI_QUOTA_EXCEEDED',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'AI Consultant could not reach AI providers. Check server configuration and logs.',
        code: 'GEMINI_ERROR',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 502 }
    );
  }
}
