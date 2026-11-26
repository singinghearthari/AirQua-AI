'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(auth && isFirebaseConfigured()));

  // Listen to auth state changes when Firebase Auth is configured
  useEffect(() => {
    if (!auth || !isFirebaseConfigured()) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.warn('Firebase Auth state change error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Running in Guest Mode.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Running in Guest Mode.');
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Running in Guest Mode.');
      }
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
        setUser({ ...cred.user, displayName: displayName.trim() });
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isFirebaseConfigured: isFirebaseConfigured(),
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
