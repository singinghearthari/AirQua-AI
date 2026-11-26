import React from 'react';
import { Loader2, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface EmailPasswordFormProps {
  tab: 'signin' | 'signup';
  displayName: string;
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  onChangeDisplayName: (val: string) => void;
  onChangeEmail: (val: string) => void;
  onChangePassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EmailPasswordForm({
  tab,
  displayName,
  email,
  password,
  isLoading,
  error,
  emailInputRef,
  onChangeDisplayName,
  onChangeEmail,
  onChangePassword,
  onSubmit,
}: EmailPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {tab === 'signup' && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="auth-name"
            className="text-[12px] font-medium text-on-surface flex items-center gap-1.5"
          >
            <UserIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Your Name (Optional)</span>
          </label>
          <input
            id="auth-name"
            type="text"
            value={displayName}
            onChange={(e) => onChangeDisplayName(e.target.value)}
            placeholder="e.g., Rajesh Kumar"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="auth-email"
          className="text-[12px] font-medium text-on-surface flex items-center gap-1.5"
        >
          <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Email Address</span>
        </label>
        <input
          id="auth-email"
          ref={emailInputRef}
          type="email"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'auth-form-error' : undefined}
          value={email}
          onChange={(e) => onChangeEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="auth-password"
          className="text-[12px] font-medium text-on-surface flex items-center gap-1.5"
        >
          <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Password (min. 6 characters)</span>
        </label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={6}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'auth-form-error' : undefined}
          value={password}
          onChange={(e) => onChangePassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div
          id="auth-form-error"
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container p-2.5 text-on-error-container text-[12px] flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary py-2.5 text-[13px] font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Processing...</span>
          </>
        ) : (
          <span>{tab === 'signin' ? 'Sign In' : 'Create Free Account'}</span>
        )}
      </button>
    </form>
  );
}
