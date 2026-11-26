import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchWithTimeout, jsonError, jsonOk, parseJsonBody } from '@/lib/api/http';
import { isFirebaseConfigured } from '@/lib/firebase/client';

export const runtime = 'nodejs';

interface StoredUserAction {
  id: string;
  headline: string;
  action: string;
  period: string;
  savedAt: string;
}

const guestActionsMemoryStore = new Map<string, StoredUserAction[]>();

const ActionPayloadSchema = z.object({
  id: z.string().optional(),
  headline: z.string().min(1).max(200),
  action: z.string().min(1).max(1000),
  period: z.string().max(50).optional().default('ANY'),
});

interface IdentityToolkitResponse {
  users?: Array<{ localId?: string }>;
}

async function verifyFirebaseIdToken(token: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
        timeoutMs: 6000,
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as IdentityToolkitResponse;
    return data.users?.[0]?.localId || null;
  } catch (err) {
    console.warn('Firebase token verification network error:', err);
    return null;
  }
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
}

/**
 * Lists saved routine actions for authenticated Firebase users or explains Guest Mode persistence.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request);

  if (!token || !isFirebaseConfigured()) {
    return jsonOk({
      mode: 'GUEST',
      message: 'Guest mode active. Actions are persisted in local browser storage.',
      actions: [],
    });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return jsonError('Invalid or expired authentication token', 401);
  }

  const userActions = guestActionsMemoryStore.get(uid) || [];
  return jsonOk({ mode: 'FIREBASE_AUTH', uid, actions: userActions });
}

/**
 * Saves a routine action item for an authenticated user or returns a Guest Mode payload.
 */
export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(
    request,
    ActionPayloadSchema,
    'Invalid action payload'
  );
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const newAction: StoredUserAction = {
    id: parsed.data.id || `${Date.now()}`,
    headline: parsed.data.headline,
    action: parsed.data.action,
    period: parsed.data.period ?? 'ANY',
    savedAt: new Date().toISOString(),
  };

  const token = extractBearerToken(request);
  if (!token || !isFirebaseConfigured()) {
    return jsonOk({
      mode: 'GUEST',
      saved: true,
      action: newAction,
    });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return jsonError('Unauthorized', 401);
  }

  const existing = guestActionsMemoryStore.get(uid) || [];
  existing.push(newAction);
  guestActionsMemoryStore.set(uid, existing);

  return jsonOk({ mode: 'FIREBASE_AUTH', saved: true, action: newAction });
}
