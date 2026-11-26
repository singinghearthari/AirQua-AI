'use client';

import React from 'react';
import { Loader2, Mic, MicOff, Send } from 'lucide-react';
import { SupportedLanguage } from '@/types/airqua';

interface ChatInputFormProps {
  input: string;
  onChangeInput: (val: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  isListening: boolean;
  sttSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  language: SupportedLanguage;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ChatInputForm({
  input,
  onChangeInput,
  onSubmit,
  isSending,
  isListening,
  sttSupported,
  onStartListening,
  onStopListening,
  language,
  placeholder,
  sendLabel,
  sendingLabel,
  inputRef,
}: ChatInputFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (isListening ? onStopListening() : onStartListening())}
          disabled={!sttSupported || isSending}
          aria-pressed={isListening}
          aria-label={
            !sttSupported
              ? 'Speech recognition not supported in this browser'
              : isListening
                ? 'Stop listening'
                : `Start voice input in ${language === 'ta' ? 'Tamil' : 'English'}`
          }
          title={
            !sttSupported
              ? 'Speech recognition not supported in this browser'
              : isListening
                ? 'Stop listening'
                : `Click to speak in ${language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}`
          }
          className={`p-2.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isListening
              ? 'bg-error text-on-error animate-pulse shadow-md ring-2 ring-error/50'
              : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-primary'
          }`}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          maxLength={800}
          onChange={(e) => onChangeInput(e.target.value)}
          disabled={isSending}
          placeholder={
            isListening
              ? language === 'ta'
                ? 'நீங்கள் பேசுவது கேட்கிறது...'
                : 'Listening... speak your question...'
              : placeholder
          }
          aria-label="Message input for AI Consultant"
          className="flex-1 bg-transparent px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-variant/60 border-none outline-none focus:ring-0"
        />

        <button
          type="submit"
          disabled={!input.trim() || isSending}
          aria-label={isSending ? sendingLabel : sendLabel}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 text-[13px] font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{isSending ? sendingLabel : sendLabel}</span>
        </button>
      </div>

      <div className="flex items-center justify-between px-2 pt-1 border-t border-outline-variant/40 text-[11px] font-mono text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Mic className="h-3 w-3 text-primary" aria-hidden="true" />
          <span>Voice input: {language === 'ta' ? 'தமிழ் (Tamil)' : 'English (India)'}</span>
        </span>
        <span>{input.length}/800</span>
      </div>
    </form>
  );
}
