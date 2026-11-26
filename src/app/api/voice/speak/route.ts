import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGroqClient } from '@/lib/ai/groqClient';
import {
  enforceRateLimit,
  getErrorMessage,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/api/http';
import {
  detectMessageLanguage,
  stripMarkdownForSpeech,
} from '@/lib/voice/speechUtils';

export const runtime = 'nodejs';

const SpeakRequestSchema = z.object({
  text: z.string().min(1).max(1000, 'Text cannot exceed 1000 characters for speech'),
  language: z.enum(['en', 'ta']).optional().default('en'),
});

/**
 * Synthesizes English speech via Groq Orpheus neural TTS and gracefully signals
 * browser SpeechSynthesis fallback for Tamil (`ta`) or unavailable upstream service.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(
    request,
    25,
    60 * 1000,
    'Too many speech requests. Please wait a moment.'
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBody(request, SpeakRequestSchema, 'Invalid speak request');
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const { text, language } = parsed.data;
  const cleanText = stripMarkdownForSpeech(text);

  if (!cleanText) {
    return jsonError('Text was empty after sanitization', 400);
  }

  const groq = getGroqClient();
  const effectiveLang =
    language === 'ta' || detectMessageLanguage(cleanText) === 'ta' ? 'ta' : 'en';

  if (effectiveLang === 'ta' || !groq) {
    return jsonOk({
      fallbackToBrowserTTS: true,
      reason:
        effectiveLang === 'ta'
          ? 'Tamil speech synthesis uses native Indian Tamil neural voices in browser'
          : 'Groq API key unconfigured',
    });
  }

  try {
    const speechResponse = await groq.audio.speech.create({
      model: 'canopylabs/orpheus-v1-english',
      voice: 'troy',
      input: cleanText,
      response_format: 'wav',
    });

    const arrayBuffer = await speechResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 'Groq speech model error, using browser synthesis');
    console.warn(
      '[api/voice/speak] Groq speech model unavailable or terms required, falling back to browser TTS:',
      message
    );

    return jsonOk({
      fallbackToBrowserTTS: true,
      reason: message,
    });
  }
}
