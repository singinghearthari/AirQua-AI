import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a server-only instance of the GoogleGenAI client.
 * Strictly server-side: never exposed to client-side code.
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
        timeout: 15000, // 15-second timeout guardrail
      },
    });
  }

  return cachedClient;
}
