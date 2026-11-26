import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  structured?: unknown;
  provenance?: string;
  aiProvider?: 'gemini' | 'groq-backup';
  timestamp: string;
  saved?: boolean;
}

/**
 * Saves chat history messages to `users/{uid}/conversations/default`.
 */
export async function saveChatConversation(
  uid: string,
  messages: StoredChatMessage[]
): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    const chatDocRef = doc(db, 'users', uid, 'conversations', 'default');
    await setDoc(
      chatDocRef,
      {
        messages,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('Failed to save chat conversation in Firestore:', error);
    return false;
  }
}

/**
 * Retrieves chat history messages from `users/{uid}/conversations/default`.
 */
export async function getChatConversation(
  uid: string
): Promise<StoredChatMessage[] | null> {
  if (!db || !isFirebaseConfigured() || !uid) return null;

  try {
    const chatDocRef = doc(db, 'users', uid, 'conversations', 'default');
    const snap = await getDoc(chatDocRef);
    if (!snap.exists()) return null;
    const data = snap.data() as { messages?: StoredChatMessage[] } | undefined;
    return data?.messages || [];
  } catch (error) {
    console.warn('Failed to fetch chat conversation from Firestore:', error);
    return null;
  }
}

/**
 * Clears chat conversation from `users/{uid}/conversations/default`.
 */
export async function clearChatConversation(uid: string): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    const chatDocRef = doc(db, 'users', uid, 'conversations', 'default');
    await deleteDoc(chatDocRef);
    return true;
  } catch (error) {
    console.warn('Failed to clear chat conversation from Firestore:', error);
    return false;
  }
}
