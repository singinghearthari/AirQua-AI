import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isFirebaseConfigured } from '@/lib/firebase/client';

export const runtime = 'nodejs';

// In-memory store for guest/demo sessions when Firestore is not directly bound
const guestActionsMemoryStore = new Map<string, any[]>();

const ActionPayloadSchema = z.object({
  id: z.string().optional(),
  headline: z.string().min(1).max(200),
  action: z.string().min(1).max(1000),
  period: z.string().max(50).optional().default('ANY'),
});

async function verifyFirebaseIdToken(token: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId || null;
  } catch (err) {
    console.warn('Firebase token verification network error:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token || !isFirebaseConfigured()) {
    return NextResponse.json({
      mode: 'GUEST',
      message: 'Guest mode active. Actions are persisted in local browser storage.',
      actions: [],
    });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
  }

  const userActions = guestActionsMemoryStore.get(uid) || [];
  return NextResponse.json({ mode: 'FIREBASE_AUTH', uid, actions: userActions });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parseResult = ActionPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid action payload', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token || !isFirebaseConfigured()) {
    // Guest Mode fallback
    return NextResponse.json({
      mode: 'GUEST',
      saved: true,
      action: {
        ...parseResult.data,
        id: parseResult.data.id || `${Date.now()}`,
        savedAt: new Date().toISOString(),
      },
    });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newAction = {
    ...parseResult.data,
    id: parseResult.data.id || `${Date.now()}`,
    savedAt: new Date().toISOString(),
  };

  const existing = guestActionsMemoryStore.get(uid) || [];
  existing.push(newAction);
  guestActionsMemoryStore.set(uid, existing);

  return NextResponse.json({ mode: 'FIREBASE_AUTH', saved: true, action: newAction });
}
