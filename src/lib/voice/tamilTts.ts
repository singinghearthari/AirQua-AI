import { fetchWithTimeout } from '@/lib/api/http';
import { splitTextForSpeech } from '@/lib/voice/speechUtils';

/**
 * Fetches chunked Tamil MP3 audio (`<= 180` chars per chunk) from Google Translate TTS
 * and concatenates the MPEG byte frames into a single `ArrayBuffer`.
 */
export async function synthesizeTamilMpegAudio(cleanText: string): Promise<ArrayBuffer> {
  const chunks = splitTextForSpeech(cleanText, 180);
  if (chunks.length === 0) {
    throw new Error('No Tamil text chunks available for synthesis');
  }

  const byteChunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (const chunk of chunks) {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ta&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const response = await fetchWithTimeout(ttsUrl, {
      timeoutMs: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg',
      },
    });

    if (!response.ok) {
      throw new Error(`Tamil TTS upstream returned HTTP ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new Error('Tamil TTS upstream returned empty audio payload');
    }

    byteChunks.push(bytes);
    totalBytes += bytes.byteLength;
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of byteChunks) {
    combined.set(part, offset);
    offset += part.byteLength;
  }

  return combined.buffer;
}
