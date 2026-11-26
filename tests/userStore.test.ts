import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveUserPreferences,
  getUserPreferences,
  syncSavedActions,
  saveActionToFirestore,
  removeActionFromFirestore,
  saveActivityHistory,
  getActivityHistory,
} from '@/lib/firebase/userStore';
import { SavedActionItem } from '@/context/AirquaContext';

// Mock client to control isFirebaseConfigured and db
vi.mock('@/lib/firebase/client', () => {
  return {
    db: { type: 'mock-db' },
    isFirebaseConfigured: vi.fn(() => true),
  };
});

// Mock firestore methods
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn(),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    query: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/client';

describe('userStore - Cloud Firestore Persistence & Guest Fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFirebaseConfigured).mockReturnValue(true);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Unauthenticated / Empty UID Fallbacks (Guest Mode)', () => {
    it('saveUserPreferences returns false when uid is empty', async () => {
      const result = await saveUserPreferences('', { persona: 'SENIOR' });
      expect(result).toBe(false);
    });

    it('getUserPreferences returns null when uid is empty', async () => {
      const result = await getUserPreferences('');
      expect(result).toBeNull();
    });

    it('syncSavedActions returns localActions unchanged when uid is empty', async () => {
      const local: SavedActionItem[] = [
        {
          id: 'act-1',
          headline: 'Morning Ventilation',
          action: 'Open windows 12:00-14:00',
          period: 'Morning',
          savedAt: '2026-11-21T10:00:00.000Z',
        },
      ];
      const result = await syncSavedActions('', local);
      expect(result).toEqual(local);
    });

    it('saveActionToFirestore and removeActionFromFirestore return false when uid is empty', async () => {
      const saveRes = await saveActionToFirestore('', {
        id: '1',
        headline: 'Test',
        action: 'Test action',
        period: 'Morning',
        savedAt: '2026-11-21T10:00:00.000Z',
      });
      const removeRes = await removeActionFromFirestore('', '1');
      expect(saveRes).toBe(false);
      expect(removeRes).toBe(false);
    });

    it('saveActivityHistory returns false and getActivityHistory returns empty array when uid is empty', async () => {
      const saveRes = await saveActivityHistory('', {
        type: 'ROOM_SCAN',
        summary: 'Test scan',
      });
      const history = await getActivityHistory('');
      expect(saveRes).toBe(false);
      expect(history).toEqual([]);
    });
  });

  describe('Authenticated Operations', () => {
    it('saveUserPreferences calls setDoc with merged preferences and timestamp', async () => {
      const res = await saveUserPreferences('user-123', {
        persona: 'COMMUTER',
        scale: 'IN_CPCB',
        language: 'ta',
      });

      expect(res).toBe(true);
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-123' }),
        expect.objectContaining({
          persona: 'COMMUTER',
          scale: 'IN_CPCB',
          language: 'ta',
          updatedAt: 'MOCK_TIMESTAMP',
        }),
        { merge: true }
      );
    });

type DocSnapshot = Awaited<ReturnType<typeof getDoc>>;
type QuerySnapshot = Awaited<ReturnType<typeof getDocs>>;

    it('getUserPreferences parses data when document exists', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ persona: 'STUDENT_ATHLETE', scale: 'US_EPA' }),
      } as unknown as DocSnapshot);

      const res = await getUserPreferences('user-456');
      expect(res).toEqual({ persona: 'STUDENT_ATHLETE', scale: 'US_EPA' });
    });

    it('getUserPreferences returns null when document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as unknown as DocSnapshot);

      const res = await getUserPreferences('user-nonexistent');
      expect(res).toBeNull();
    });

    it('syncSavedActions merges remote actions and migrates new local actions to Firestore', async () => {
      const remoteItem: SavedActionItem = {
        id: 'remote-1',
        headline: 'Cloud Action',
        action: 'Clean purifier pre-filter',
        period: 'Evening',
        savedAt: '2026-11-21T12:00:00.000Z',
      };

      const localItem: SavedActionItem = {
        id: 'local-1',
        headline: 'Guest Action to Migrate',
        action: 'Wear N95 during evening commute',
        period: 'Evening',
        savedAt: '2026-11-21T11:00:00.000Z',
      };

      // Mock getDocs returning remoteItem
      vi.mocked(getDocs).mockResolvedValueOnce({
        forEach: (callback: (doc: { id: string; data: () => SavedActionItem }) => void) => {
          callback({
            id: 'remote-1',
            data: () => remoteItem,
          });
        },
      } as unknown as QuerySnapshot);

      const merged = await syncSavedActions('user-789', [localItem]);

      // Expect localItem to be written to Firestore
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-789/actions/local-1' }),
        localItem
      );

      // Result should contain both, sorted by savedAt desc
      expect(merged).toHaveLength(2);
      expect(merged[0].id).toBe('remote-1'); // 12:00 is newer than 11:00
      expect(merged[1].id).toBe('local-1');
    });

    it('gracefully handles Firestore network failure without throwing', async () => {
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('Network offline'));

      const res = await getUserPreferences('user-fail');
      expect(res).toBeNull();
    });
  });
});
