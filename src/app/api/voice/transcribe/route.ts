import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/ai/groqClient';
import { enforceRateLimit, getErrorMessage, jsonError } from '@/lib/api/http';

export const runtime = 'nodejs';

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Transcribes multipart audio recordings in English (`en`) or Tamil (`ta`) using Groq Whisper.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(
    request,
    20,
    60 * 1000,
    'Too many transcription requests. Please wait a moment.'
  );
  if (rateLimitResponse) return rateLimitResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('Invalid multipart form data payload', 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return jsonError('Missing audio file in form data', 400);
  }

  const audioBlob = file as Blob;
  if (audioBlob.size > MAX_AUDIO_SIZE_BYTES) {
    return jsonError('Audio file exceeds 10 MB limit', 413);
  }

  const languageRaw = formData.get('language');
  const language = languageRaw === 'ta' ? 'ta' : 'en';

  const groq = getGroqClient();
  if (!groq) {
    return jsonError('Groq API key not configured on server.', 503, {
      extra: { fallbackToBrowserSTT: true },
    });
  }

  try {
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
  } catch (err: unknown) {
    const message = getErrorMessage(err, 'Failed to transcribe audio via Groq Whisper.');
    console.error('[api/voice/transcribe] Groq Whisper error:', message);
    return jsonError(message, 502, {
      extra: { fallbackToBrowserSTT: true },
    });
  }
}
