import Groq from 'groq-sdk';

let cachedGroqClient: Groq | null = null;

/**
 * Returns a server-only instance of the Groq client.
 * Strictly server-side: never exposed to client-side code.
 */
export function getGroqClient(): Groq | null {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: Groq client must only be initialized on the server.');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!cachedGroqClient) {
    cachedGroqClient = new Groq({
      apiKey,
      timeout: 15000, // 15-second timeout guardrail
    });
  }

  return cachedGroqClient;
}

/**
 * Detects if an error is a rate limit, quota exhaustion (HTTP 429 / RESOURCE_EXHAUSTED),
 * transient service overload (503), or timeout from primary AI providers (Google Gemini).
 */
export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;

  const status = err.status || err.statusCode || err.response?.status;
  if (status === 429 || status === 503) {
    return true;
  }

  const message = (err.message || String(err)).toLowerCase();
  const code = (err.code || err.statusText || '').toLowerCase();

  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('rate_limit') ||
    message.includes('overloaded') ||
    message.includes('deadline exceeded') ||
    message.includes('timeout') ||
    code.includes('resource_exhausted') ||
    code.includes('rate_limit')
  );
}
