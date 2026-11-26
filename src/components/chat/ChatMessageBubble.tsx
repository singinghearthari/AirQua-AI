'use client';

import React from 'react';
import Image from 'next/image';
import {
  BookmarkPlus,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { RecommendedAction } from '@/lib/gemini/schemas';
import { HouseholdPersona } from '@/types/airqua';
import ProvenanceBadge from './ProvenanceBadge';
import ChatRecommendedActions from './ChatRecommendedActions';
import type { MessageItem } from '@/lib/storage/chatStorage';

interface ChatMessageBubbleProps {
  msg: MessageItem;
  persona: HouseholdPersona;
  isLatestModelMessage: boolean;
  isSpeaking: boolean;
  activeSpeakingMsgId: string | null;
  ttsSupported: boolean;
  isSending: boolean;
  savedActionTitles: Record<string, boolean>;
  saveActionLabel: string;
  savedActionLabel: string;
  onToggleSpeak: (msg: MessageItem) => void;
  onSaveActionItem: (action: RecommendedAction) => void;
  onSaveFullMessageAction: (msg: MessageItem) => void;
  onSendFollowUp: (prompt: string) => void;
}

export default function ChatMessageBubble({
  msg,
  persona,
  isLatestModelMessage,
  isSpeaking,
  activeSpeakingMsgId,
  ttsSupported,
  isSending,
  savedActionTitles,
  saveActionLabel,
  savedActionLabel,
  onToggleSpeak,
  onSaveActionItem,
  onSaveFullMessageAction,
  onSendFollowUp,
}: ChatMessageBubbleProps) {
  const isUser = msg.role === 'user';
  const isMsgSpeaking = isSpeaking && activeSpeakingMsgId === msg.id;

  return (
    <div
      className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[82%] ${
        isUser ? 'self-end items-end' : 'self-start items-start'
      }`}
    >
      <div className="flex items-center gap-2 px-1">
        {!isUser && (
          <div className="h-5 w-5 rounded-full overflow-hidden border border-outline-variant/60 shadow-2xs shrink-0 bg-surface-container">
            <Image
              src="/logo.jpeg"
              alt="AIRQUA AI Avatar"
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        {!isUser && msg.provenance && <ProvenanceBadge kind={msg.provenance} />}
        {!isUser && msg.aiProvider === 'groq-backup' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-medium">
            <Zap className="h-3 w-3 text-amber-500" aria-hidden="true" />
            Groq Backup
          </span>
        )}
        <span className="text-[10px] font-mono text-on-surface-variant">{msg.timestamp}</span>

        {!isUser && ttsSupported && (
          <button
            type="button"
            onClick={() => onToggleSpeak(msg)}
            aria-label={isMsgSpeaking ? 'Stop voice readout' : 'Listen to this response'}
            title={isMsgSpeaking ? 'Stop speaking' : 'Listen with voice assistance'}
            className={`p-1 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
              isMsgSpeaking
                ? 'bg-primary text-on-primary animate-pulse'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
            }`}
          >
            {isMsgSpeaking ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div
        className={`p-4 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed flex flex-col gap-3 ${
          isUser
            ? 'bg-primary text-on-primary rounded-br-xs shadow-xs'
            : 'bg-surface-container-low border border-outline-variant/60 text-on-surface rounded-bl-xs shadow-2xs'
        }`}
      >
        <div className="whitespace-pre-wrap font-normal leading-relaxed">
          {msg.structured ? msg.structured.answer : msg.text}
        </div>

        {!isUser && msg.structured?.whyItMatters && (
          <div className="rounded-xl border border-primary/25 bg-surface-container p-3 flex flex-col gap-1 shadow-2xs">
            <span className="font-semibold text-primary text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Scientific Why It Matters</span>
            </span>
            <p className="text-[12px] text-on-surface leading-relaxed">
              {msg.structured.whyItMatters}
            </p>
          </div>
        )}

        {!isUser && msg.structured?.recommendedActions && (
          <ChatRecommendedActions
            actions={msg.structured.recommendedActions}
            personaLabel={persona}
            savedActionTitles={savedActionTitles}
            onSaveActionItem={onSaveActionItem}
          />
        )}

        {!isUser && !msg.structured?.recommendedActions && (
          <div className="mt-1 pt-2 border-t border-outline-variant/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-on-surface-variant">
              Grounded in Live Telemetry
            </span>

            <button
              type="button"
              onClick={() => onSaveFullMessageAction(msg)}
              disabled={msg.saved}
              aria-label="Save this advice to your routine checklist"
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                msg.saved
                  ? 'bg-aqi-good/20 text-aqi-good border border-aqi-good/30'
                  : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
              }`}
            >
              {msg.saved ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-aqi-good" aria-hidden="true" />
                  <span>{savedActionLabel || 'Saved to Routine'}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-3 w-3 text-primary" aria-hidden="true" />
                  <span>{saveActionLabel || 'Save Action'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!isUser &&
        isLatestModelMessage &&
        msg.structured?.followUpPrompts &&
        msg.structured.followUpPrompts.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2 pl-2">
            <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1 font-semibold">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              Suggested Follow-Ups:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {msg.structured.followUpPrompts.map((promptText, fIdx) => (
                <button
                  key={fIdx}
                  type="button"
                  disabled={isSending}
                  onClick={() => onSendFollowUp(promptText)}
                  aria-label={`Follow-up question: ${promptText}`}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-container/20 hover:bg-primary-container/40 text-on-surface px-3 py-1 text-[12px] font-medium transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                >
                  <span>{promptText}</span>
                  <ChevronRight className="h-3 w-3 text-primary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
