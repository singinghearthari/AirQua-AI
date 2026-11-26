import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';
import {
  AqiScale,
  CityPreset,
  HouseholdPersona,
  SupportedLanguage,
} from '@/types/airqua';
import { SavedActionItem } from '@/context/AirquaContext';

export {
  saveChatConversation,
  getChatConversation,
  clearChatConversation,
  type StoredChatMessage,
} from './chatStore';

export interface UserPreferencesDoc {
  city?: CityPreset;
  persona?: HouseholdPersona;
  scale?: AqiScale;
  language?: SupportedLanguage;
  updatedAt?: unknown;
}

export interface ActivityHistoryItem {
  id?: string;
  type: 'ROOM_SCAN' | 'SIMULATION';
  summary: string;
  details?: Record<string, unknown>;
  createdAt?: unknown;
}

/**
 * Save user preferences to Cloud Firestore under `users/{uid}`.
 */
export async function saveUserPreferences(
  uid: string,
  prefs: Partial<UserPreferencesDoc>
): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Failed to save user preferences to Firestore:', error);
    return false;
  }
}

/**
 * Retrieve user preferences from Cloud Firestore under `users/{uid}`.
 */
export async function getUserPreferences(uid: string): Promise<UserPreferencesDoc | null> {
  if (!db || !isFirebaseConfigured() || !uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);
    return snapshot.exists() ? (snapshot.data() as UserPreferencesDoc) : null;
  } catch (error) {
    console.warn('Failed to fetch user preferences from Firestore:', error);
    return null;
  }
}

/**
 * Syncs and migrates Saved Actions between local storage and Firestore `users/{uid}/actions`.
 */
export async function syncSavedActions(
  uid: string,
  localActions: SavedActionItem[]
): Promise<SavedActionItem[]> {
  if (!db || !isFirebaseConfigured() || !uid) return localActions;

  try {
    const actionsCollRef = collection(db, 'users', uid, 'actions');
    const remoteSnap = await getDocs(actionsCollRef);
    const remoteActions: SavedActionItem[] = [];
    const remoteActionIds = new Set<string>();

    remoteSnap.forEach((d) => {
      const data = d.data() as SavedActionItem;
      remoteActions.push(data);
      remoteActionIds.add(data.id || d.id);
    });

    const pendingUploads = localActions.filter((a) => !remoteActionIds.has(a.id));
    for (const action of pendingUploads) {
      try {
        await setDoc(doc(db, 'users', uid, 'actions', action.id), action);
        remoteActions.push(action);
      } catch (err) {
        console.warn('Failed to migrate action to Firestore:', err);
      }
    }

    remoteActions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return remoteActions.length > 0 ? remoteActions : localActions;
  } catch (error) {
    console.warn('Failed to sync saved actions with Firestore:', error);
    return localActions;
  }
}

/**
 * Saves a single action item to Cloud Firestore under `users/{uid}/actions/{id}`.
 */
export async function saveActionToFirestore(
  uid: string,
  action: SavedActionItem
): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    await setDoc(doc(db, 'users', uid, 'actions', action.id), action);
    return true;
  } catch (error) {
    console.warn('Failed to save action to Firestore:', error);
    return false;
  }
}

/**
 * Removes a single action item from Cloud Firestore under `users/{uid}/actions/{id}`.
 */
export async function removeActionFromFirestore(
  uid: string,
  actionId: string
): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    await deleteDoc(doc(db, 'users', uid, 'actions', actionId));
    return true;
  } catch (error) {
    console.warn('Failed to remove action from Firestore:', error);
    return false;
  }
}

/**
 * Records activity history (Room Scan results, Simulator runs) to `users/{uid}/history`.
 */
export async function saveActivityHistory(
  uid: string,
  activity: Omit<ActivityHistoryItem, 'id' | 'createdAt'>
): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) return false;

  try {
    await addDoc(collection(db, 'users', uid, 'history'), {
      ...activity,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.warn('Failed to record activity history in Firestore:', error);
    return false;
  }
}

/**
 * Fetches recent activity history for a user.
 */
export async function getActivityHistory(
  uid: string,
  limitCount = 10
): Promise<ActivityHistoryItem[]> {
  if (!db || !isFirebaseConfigured() || !uid) return [];

  try {
    const q = query(
      collection(db, 'users', uid, 'history'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const items: ActivityHistoryItem[] = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ActivityHistoryItem));
    return items;
  } catch (error) {
    console.warn('Failed to fetch activity history from Firestore:', error);
    return [];
  }
}
