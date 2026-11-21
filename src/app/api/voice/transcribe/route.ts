import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/ai/groqClient';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (20 requests per minute)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const rateCheck = checkRateLimit(clientIp, 20, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Too many transcription requests. Please wait a moment.',
        retryAfterSec: rateCheck.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': rateCheck.retryAfterSec.toString() },
      }
    );
  }

  // 2. Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart form data payload' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'Missing audio file in form data' },
      { status: 400 }
    );
  }

  const audioBlob = file as Blob;
  if (audioBlob.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Audio file exceeds 10 MB limit' },
      { status: 413 }
    );
  }

  const languageRaw = formData.get('language');
  const language = languageRaw === 'ta' ? 'ta' : 'en';

  // 3. Groq Whisper Transcription
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      {
        error: 'Groq API key not configured on server.',
        fallbackToBrowserSTT: true,
      },
      { status: 503 }
    );
  }

  try {
    // If Blob has no name, provide a File with filename so Groq's multipart handler detects format
    const audioFile =
      file instanceof File
        ? file
        : new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language,
      response_format: 'json',
    });

    return NextResponse.json({
      text: transcription.text || '',
      provider: 'groq-whisper',
    });
  } catch (err: any) {
    console.error('[api/voice/transcribe] Groq Whisper error:', err?.message || err);
    return NextResponse.json(
      {
        error: err?.message || 'Failed to transcribe audio via Groq Whisper.',
        fallbackToBrowserSTT: true,
      },
      { status: 502 }
    );
  }
}
