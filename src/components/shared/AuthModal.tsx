'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getReadableAuthErrorMessage } from '@/lib/firebase/authErrors';
import EmailPasswordForm from './EmailPasswordForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'signin',
}: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: emailInputRef,
    onClose,
  });

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      setError(getReadableAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      onClose();
    } catch (err: unknown) {
      setError(getReadableAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg overflow-hidden border border-outline-variant/60 shadow-xs shrink-0">
              <Image
                src="/logo.jpeg"
                alt="AIRQUA AI"
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
            <h2 id="auth-modal-title" className="font-display font-bold text-[18px] text-on-surface">
              {tab === 'signin' ? 'Sign In to AIRQUA AI' : 'Create Free Account'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          Sync your active city, Household Persona, 24h safe windows, and saved routine checklist
          seamlessly across your devices with Cloud Firestore.
        </p>

        <div
          role="tablist"
          aria-label="Authentication Options"
          className="grid grid-cols-2 rounded-lg border border-outline-variant p-1 bg-surface-container-low"
        >
          {(['signin', 'signup'] as const).map((mode) => (
            <button
              key={mode}
              id={`auth-tab-${mode}`}
              type="button"
              role="tab"
              aria-selected={tab === mode}
              aria-controls="auth-tabpanel"
              onClick={() => {
                setTab(mode);
                setError(null);
              }}
              className={`py-1.5 text-[13px] font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                tab === mode
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div
          id="auth-tabpanel"
          role="tabpanel"
          aria-labelledby={`auth-tab-${tab}`}
          className="flex flex-col gap-5"
        >
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-label="Sign in using your Google account"
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-low py-2.5 px-4 text-[13px] font-semibold text-on-surface transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/60" />
            </div>
            <span className="relative bg-surface-container-lowest px-2 text-[11px] font-mono uppercase text-on-surface-variant">
              or with email
            </span>
          </div>

          <EmailPasswordForm
            tab={tab}
            displayName={displayName}
            email={email}
            password={password}
            isLoading={isLoading}
            error={error}
            emailInputRef={emailInputRef}
            onChangeDisplayName={setDisplayName}
            onChangeEmail={setEmail}
            onChangePassword={setPassword}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1 font-mono">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            Zero Login Wall Guaranteed
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-primary font-semibold hover:underline rounded px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
