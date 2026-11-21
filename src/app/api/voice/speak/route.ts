import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGroqClient } from '@/lib/ai/groqClient';
import { stripMarkdownForSpeech } from '@/hooks/useVoiceAssistant';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

const SpeakRequestSchema = z.object({
  text: z.string().min(1).max(1000, 'Text cannot exceed 1000 characters for speech'),
  language: z.enum(['en', 'ta']).optional().default('en'),
});

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (25 requests per minute)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const rateCheck = checkRateLimit(clientIp, 25, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Too many speech requests. Please wait a moment.',
        retryAfterSec: rateCheck.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': rateCheck.retryAfterSec.toString() },
      }
    );
  }

  // 2. Parse & Validate Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parseResult = SpeakRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid speak request', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { text, language } = parseResult.data;
  const cleanText = stripMarkdownForSpeech(text);

  if (!cleanText) {
    return NextResponse.json({ error: 'Text was empty after sanitization' }, { status: 400 });
  }

  // 3. For Tamil or missing Groq client, cleanly signal fallback to browser SpeechSynthesis
  const groq = getGroqClient();
  if (language === 'ta' || !groq) {
    return NextResponse.json(
      {
        fallbackToBrowserTTS: true,
        reason:
          language === 'ta'
            ? 'Tamil speech synthesis uses native Indian Tamil neural voices in browser'
            : 'Groq API key unconfigured',
      },
      { status: 200 }
    );
  }

  // 4. For English, attempt Groq Orpheus Neural Audio
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
      },
    });
  } catch (err: any) {
    console.warn(
      '[api/voice/speak] Groq speech model unavailable or terms required, falling back to browser TTS:',
      err?.message || err
    );

    // Smoothly signal fallback to browser speech synthesis
    return NextResponse.json(
      {
        fallbackToBrowserTTS: true,
        reason: err?.message || 'Groq speech model error, using browser synthesis',
      },
      { status: 200 }
    );
  }
}
