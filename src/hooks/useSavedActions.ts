import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedActionItem } from '@/context/AirquaContext';
import { loadStoredActions, persistActions } from '@/lib/storage/airquaStorage';
import {
  removeActionFromFirestore,
  saveActionToFirestore,
  syncSavedActions,
} from '@/lib/firebase/userStore';

/**
 * Manages the user's "Today's Plan" checklist across localStorage (Guest Mode)
 * and Cloud Firestore (`users/{uid}/actions`).
 */
export function useSavedActions(uid: string | undefined, showToast: (msg: string) => void) {
  const [savedActions, setSavedActions] = useState<SavedActionItem[]>([]);
  const savedActionsRef = useRef<SavedActionItem[]>(savedActions);

  useEffect(() => {
    savedActionsRef.current = savedActions;
  }, [savedActions]);

  useEffect(() => {
    queueMicrotask(() => {
      const local = loadStoredActions();
      if (local.length > 0) {
        setSavedActions(local);
      }
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    let active = true;

    const localBaseline =
      savedActionsRef.current.length > 0 ? savedActionsRef.current : loadStoredActions();

    syncSavedActions(uid, localBaseline)
      .then((merged) => {
        if (!active) return;
        setSavedActions(merged);
        persistActions(merged);
      })
      .catch((err) => console.warn('Failed to sync actions with Firestore:', err));

    return () => {
      active = false;
    };
  }, [uid]);

  const saveAction = useCallback(
    (item: Omit<SavedActionItem, 'id' | 'savedAt'>) => {
      const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newItem: SavedActionItem = {
        ...item,
        id: newId,
        savedAt: new Date().toISOString(),
        completed: false,
      };

      setSavedActions((prev) => {
        if (prev.some((a) => a.action === item.action)) return prev;
        const updated = [newItem, ...prev];
        persistActions(updated);
        return updated;
      });
      showToast("Added to Today's Plan");

      if (uid) {
        saveActionToFirestore(uid, newItem).catch((err) =>
          console.warn('Failed to save action to Firestore:', err)
        );
      }
    },
    [uid, showToast]
  );

  const toggleActionCompleted = useCallback(
    (id: string) => {
      const target = savedActionsRef.current.find((a) => a.id === id);
      const toggledItem = target ? { ...target, completed: !target.completed } : null;

      setSavedActions((prev) => {
        const updated = prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
        persistActions(updated);
        return updated;
      });

      if (uid && toggledItem) {
        saveActionToFirestore(uid, toggledItem).catch((err) =>
          console.warn('Failed to update action completion in Firestore:', err)
        );
      }
    },
    [uid]
  );

  const clearCompletedActions = useCallback(() => {
    const completedIds = savedActionsRef.current.filter((a) => a.completed).map((a) => a.id);

    setSavedActions((prev) => {
      const updated = prev.filter((a) => !a.completed);
      persistActions(updated);
      return updated;
    });
    showToast('Cleared completed actions');

    if (uid && completedIds.length > 0) {
      Promise.all(completedIds.map((id) => removeActionFromFirestore(uid, id))).catch((err) =>
        console.warn('Failed to clear completed actions in Firestore:', err)
      );
    }
  }, [uid, showToast]);

  const removeAction = useCallback(
    (id: string) => {
      setSavedActions((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        persistActions(updated);
        return updated;
      });
      if (uid) {
        removeActionFromFirestore(uid, id).catch((err) =>
          console.warn('Failed to remove action from Firestore:', err)
        );
      }
    },
    [uid]
  );

  return {
    savedActions,
    saveAction,
    removeAction,
    toggleActionCompleted,
    clearCompletedActions,
  };
}
