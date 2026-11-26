import Groq from 'groq-sdk';

let cachedGroqClient: Groq | null = null;

interface ErrorShape {
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  statusText?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
  };
}

/**
 * Returns a strictly server-side singleton instance of the Groq SDK client.
 * Returns `null` when `GROQ_API_KEY` is not configured so callers can degrade gracefully.
 *
 * @throws Error if called inside a browser runtime.
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
      timeout: 15000,
    });
  }

  return cachedGroqClient;
}

/**
 * Determines whether an upstream AI provider error warrants automatic failover
 * (HTTP 429 quota/rate-limit, `RESOURCE_EXHAUSTED`, HTTP 503 overload, or request timeout).
 */
export function isQuotaOrRateLimitError(err: unknown): boolean {
  if (!err) return false;

  const shape = (typeof err === 'object' ? err : {}) as ErrorShape;
  const status = shape.status ?? shape.statusCode ?? shape.response?.status;
  if (status === 429 || status === 503) {
    return true;
  }

  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof shape.message === 'string'
        ? shape.message
        : String(err);
  const message = rawMessage.toLowerCase();
  const code = String(shape.code ?? shape.statusText ?? '').toLowerCase();

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
