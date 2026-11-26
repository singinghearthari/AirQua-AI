'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldAlert } from 'lucide-react';
import { HouseholdPersona, SupportedLanguage } from '@/types/airqua';

interface ChatStatusBannersProps {
  isSending: boolean;
  persona: HouseholdPersona;
  error: string | null;
  lastFailedPrompt: string | null;
  onRetryPrompt: (prompt: string) => void;
  onDismissError: () => void;
  isListening: boolean;
  language: SupportedLanguage;
  transcript: string;
  onStopListening: () => void;
}

export function ChatTypingIndicator({ persona }: { persona: HouseholdPersona }) {
  return (
    <div className="self-start flex flex-col gap-1 max-w-sm">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-5 rounded-full overflow-hidden border border-outline-variant/60 shadow-2xs shrink-0 bg-surface-container">
          <Image
            src="/logo.jpeg"
            alt="AIRQUA AI Avatar"
            width={20}
            height={20}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="text-[10px] font-mono text-primary font-medium animate-pulse">
          Consulting verified telemetry...
        </span>
      </div>
      <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-on-surface-variant flex items-center gap-2.5 text-[13px] shadow-2xs">
        <div className="flex items-center gap-1 px-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>
        <span className="text-[12px] font-medium text-on-surface-variant">
          Synthesizing verified telemetry &amp; safe windows for {persona}...
        </span>
      </div>
    </div>
  );
}

export default function ChatStatusBanners({
  error,
  lastFailedPrompt,
  onRetryPrompt,
  onDismissError,
  isListening,
  language,
  transcript,
  onStopListening,
}: Omit<ChatStatusBannersProps, 'isSending' | 'persona'>) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-error-container/90 backdrop-blur-xs p-3.5 text-on-error-container text-[12px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {lastFailedPrompt && (
              <button
                type="button"
                onClick={() => onRetryPrompt(lastFailedPrompt)}
                className="px-2.5 py-1 rounded-md bg-error text-on-error font-semibold text-[11px] hover:bg-error/90 transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={onDismissError}
              className="px-2 py-1 rounded-md text-[11px] underline font-medium hover:text-on-error-container focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isListening && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-primary/40 bg-primary-container/30 px-4 py-2.5 text-[13px] text-on-surface flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-error animate-ping" aria-hidden="true" />
            <span className="font-semibold text-primary">
              Listening ({language === 'ta' ? 'தமிழ்' : 'English'})...
            </span>
            <span className="italic text-on-surface-variant">
              {transcript || 'Speak your question now...'}
            </span>
          </div>
          <button
            type="button"
            onClick={onStopListening}
            className="text-[11px] font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1.5 py-0.5 cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}
