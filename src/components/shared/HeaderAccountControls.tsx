'use client';

import React from 'react';
import { Cloud, User } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';

interface HeaderAccountControlsProps {
  user: FirebaseUser | null;
  onOpenAuthModal: (tab: 'signin' | 'signup') => void;
  onSignOut: () => void;
}

export default function HeaderAccountControls({
  user,
  onOpenAuthModal,
  onSignOut,
}: HeaderAccountControlsProps) {
  if (!user) {
    return (
      <div
        role="region"
        aria-label="Account Access"
        className="inline-flex items-center gap-1.5 p-1 rounded-full border border-primary/30 bg-primary-container/20 shadow-xs backdrop-blur-xs"
      >
        <div className="hidden lg:flex items-center gap-1.5 pl-3 pr-1 text-[12px] font-medium text-on-surface-variant">
          <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Guest Mode</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenAuthModal('signin')}
          aria-label="Log in to your account"
          className="rounded-full px-4 py-1.5 text-[12px] font-bold text-on-surface hover:text-primary hover:bg-surface-container transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => onOpenAuthModal('signup')}
          aria-label="Sign up for a free account to sync preferences and routines"
          className="rounded-full bg-primary hover:bg-primary/90 text-on-primary px-4 py-1.5 text-[12px] font-bold shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          Sign Up Free
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Signed-in Account Status"
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary-container/30 shadow-xs backdrop-blur-xs text-[12px]"
    >
      <div className="flex items-center gap-1.5 text-on-surface font-semibold">
        <span
          className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
          aria-hidden="true"
        />
        <span
          className="max-w-[130px] truncate font-bold text-primary"
          title={user.displayName || user.email || 'User'}
        >
          {user.displayName || user.email?.split('@')[0] || 'User'}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
          <Cloud className="h-3 w-3" aria-hidden="true" />
          Cloud Synced
        </span>
      </div>
      <span className="h-3 w-px bg-outline-variant/80" aria-hidden="true" />
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out of account"
        className="text-[11px] font-bold text-on-surface-variant hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
      >
        Sign Out
      </button>
    </div>
  );
}
