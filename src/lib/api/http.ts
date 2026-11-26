import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rateLimit';

export interface ErrorResponseOptions {
  code?: string;
  details?: unknown;
  headers?: HeadersInit;
  extra?: Record<string, unknown>;
}

/**
 * Safely extracts a human-readable error message from an unknown thrown value.
 * Never leaks non-string objects or crashes on primitive rejections.
 */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  if (typeof err === 'string' && err.length > 0) {
    return err;
  }
  return fallback;
}

/**
 * Extracts the best-effort client IP address from standard proxy headers.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

export const API_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
};

function mergeSecurityHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  if (!merged.has('X-Content-Type-Options')) {
    merged.set('X-Content-Type-Options', API_SECURITY_HEADERS['X-Content-Type-Options']);
  }
  return merged;
}

/**
 * Constructs a standardized JSON success response carrying mandatory `X-Content-Type-Options: nosniff` headers.
 */
export function jsonOk<T>(data: T, init: ResponseInit = {}): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: mergeSecurityHeaders(init.headers),
  });
}

/**
 * Constructs a standardized JSON error response with consistent shape.
 */
export function jsonError(
  message: string,
  status: number,
  options: ErrorResponseOptions = {}
): NextResponse {
  const payload: Record<string, unknown> = {
    error: message,
    ...(options.code ? { code: options.code } : {}),
    ...(options.details !== undefined ? { details: options.details } : {}),
    ...(options.extra ?? {}),
  };

  return NextResponse.json(payload, {
    status,
    headers: mergeSecurityHeaders(options.headers),
  });
}

/**
 * Enforces sliding-window per-IP rate limiting and returns a 429 NextResponse if exceeded.
 * Returns `null` when the request is allowed to proceed.
 */
export function enforceRateLimit(
  request: NextRequest,
  limit: number = 15,
  windowMs: number = 60 * 1000,
  message: string = 'Too many requests. Please wait before trying again.'
): NextResponse | null {
  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(clientIp, limit, windowMs);

  if (!rateCheck.allowed) {
    return jsonError(message, 429, {
      headers: { 'Retry-After': rateCheck.retryAfterSec.toString() },
      extra: { retryAfterSec: rateCheck.retryAfterSec },
    });
  }

  return null;
}

/**
 * Parses a JSON request body and validates it against the supplied Zod schema.
 * Returns typed `{ data }` on success or `{ errorResponse }` (400 Bad Request) on failure.
 */
export async function parseJsonBody<Output>(
  request: NextRequest,
  schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
  validationErrorMessage: string = 'Invalid request parameters'
): Promise<{ data: Output } | { errorResponse: NextResponse }> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      errorResponse: jsonError('Invalid JSON request body', 400),
    };
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      errorResponse: jsonError(validationErrorMessage, 400, {
        details: parsed.error.format(),
      }),
    };
  }

  return { data: parsed.data };
}

/**
 * Wraps `fetch` with an automatic `AbortController` timeout guardrail.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
