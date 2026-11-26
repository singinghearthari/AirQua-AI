'use client';

import React from 'react';
import {
  Camera,
  Clock,
  Gauge,
  ListTodo,
  MapPin,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { AirQualitySnapshot, AqiScale, CityPreset, HouseholdPersona } from '@/types/airqua';
import { MessageItem } from './GroundedChatPanel';

interface ChatContextBarProps {
  city: CityPreset;
  persona: HouseholdPersona;
  personaLabel: string;
  scale: AqiScale;
  snapshot: AirQualitySnapshot | null;
  bestWindowLabel: string;
  roomScanContext: { sceneType: string; findingsCount: number; summary: string } | null;
  simulatorSwapsContext: string[] | null;
  messages: MessageItem[];
  autoReadReplies: boolean;
  onToggleAutoRead: () => void;
  showSavedPanel: boolean;
  onToggleSavedPanel: () => void;
  savedCount: number;
  onClearChat: () => void;
}

export default function ChatContextBar({
  city,
  personaLabel,
  scale,
  snapshot,
  bestWindowLabel,
  roomScanContext,
  simulatorSwapsContext,
  messages,
  autoReadReplies,
  onToggleAutoRead,
  showSavedPanel,
  onToggleSavedPanel,
  savedCount,
  onClearChat,
}: ChatContextBarProps) {
  return (
    <div
      role="region"
      aria-label="Active Context Summary & Voice Controls"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-medium text-on-surface border border-outline-variant">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{city.name}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-medium text-on-primary-container border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{personaLabel}</span>
          </span>

          {snapshot?.aqiValue !== null && snapshot?.aqiValue !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[12px] font-mono font-bold text-on-surface border border-outline-variant">
              <span className="h-2 w-2 rounded-full bg-aqi-moderate" aria-hidden="true" />
              <span>
                {snapshot.aqiValue} • {scale} ({snapshot.aqiCategory || 'Moderate'})
              </span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-mono text-on-surface border border-outline-variant">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Safe Window: {bestWindowLabel}</span>
          </span>

          {roomScanContext && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 px-3 py-1 text-[11px] font-medium">
              <Camera className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>
                Scan Context: {roomScanContext.sceneType} ({roomScanContext.findingsCount} findings)
              </span>
            </span>
          )}

          {simulatorSwapsContext && simulatorSwapsContext.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 px-3 py-1 text-[11px] font-medium">
              <Gauge className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Simulator: {simulatorSwapsContext.length} Routines Active</span>
            </span>
          )}

          {messages.some((m) => m.aiProvider === 'groq-backup') && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 px-3 py-1 text-[11px] font-medium animate-pulse">
              <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Failover Active: Groq Backup Engine</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoRead}
            aria-pressed={autoReadReplies}
            aria-label={`Toggle auto-reading replies aloud: currently ${autoReadReplies ? 'ON' : 'OFF'}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-all border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
              autoReadReplies
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface hover:bg-surface-container border-outline-variant text-on-surface-variant'
            }`}
          >
            {autoReadReplies ? (
              <Volume2 className="h-3.5 w-3.5 text-on-primary animate-pulse" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
            )}
            <span>Auto-Read: {autoReadReplies ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSavedPanel}
            aria-expanded={showSavedPanel}
            aria-label={`View saved routine checklist (${savedCount} items)`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
          >
            <ListTodo className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Saved ({savedCount})</span>
          </button>

          <button
            type="button"
            onClick={onClearChat}
            aria-label="Clear chat conversation history"
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface hover:bg-error-container hover:text-on-error-container hover:border-error/40 px-2.5 py-1.5 text-[12px] font-medium text-on-surface-variant transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
