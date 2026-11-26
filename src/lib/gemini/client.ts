import { GoogleGenAI } from '@google/genai';
import { TIMEOUTS_MS } from '@/lib/config/timeouts';

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a strictly server-side singleton instance of the `GoogleGenAI` client
 * configured with a 15-second upstream timeout guardrail.
 *
 * @throws Error if called from a browser environment or when `GEMINI_API_KEY` is unset.
 */
export function getGeminiClient(): GoogleGenAI {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: Gemini client must only be initialized on the server.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in environment variables. Please check .env.local.'
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        timeout: TIMEOUTS_MS.AI_UPSTREAM,
      },
    });
  }

  return cachedClient;
}
