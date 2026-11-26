'use client';

import React from 'react';
import { BookmarkPlus, CheckCircle2, Repeat, Zap } from 'lucide-react';
import { RecommendedAction } from '@/lib/gemini/schemas';

interface ChatRecommendedActionsProps {
  actions: RecommendedAction[];
  personaLabel: string;
  savedActionTitles: Record<string, boolean>;
  onSaveActionItem: (action: RecommendedAction) => void;
}

export default function ChatRecommendedActions({
  actions,
  personaLabel,
  savedActionTitles,
  onSaveActionItem,
}: ChatRecommendedActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/50">
      <span className="text-[11px] font-mono font-semibold text-on-surface-variant uppercase tracking-wider">
        Recommended Actions for {personaLabel}:
      </span>
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action, actIdx) => {
          const isActionSaved = savedActionTitles[action.title];

          return (
            <div
              key={actIdx}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[12px] text-on-surface">{action.title}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      action.category === 'EXPOSURE'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : action.category === 'EMISSIONS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {action.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-container text-on-surface-variant flex items-center gap-1">
                    {action.effort === 'QUICK' ? (
                      <>
                        <Zap className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                        <span>Quick Fix</span>
                      </>
                    ) : (
                      <>
                        <Repeat className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                        <span>Daily Habit</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSaveActionItem(action)}
                disabled={isActionSaved}
                aria-label={`Save action: ${action.title}`}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer ${
                  isActionSaved
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                {isActionSaved ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-3 w-3 text-primary" aria-hidden="true" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
