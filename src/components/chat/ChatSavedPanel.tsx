'use client';

import React from 'react';
import { ListTodo, Trash2 } from 'lucide-react';
import { SavedActionItem } from '@/context/AirquaContext';

interface ChatSavedPanelProps {
  title: string;
  isSignedIn: boolean;
  savedActions: SavedActionItem[];
  onRemoveAction: (id: string) => void;
}

export default function ChatSavedPanel({
  title,
  isSignedIn,
  savedActions,
  onRemoveAction,
}: ChatSavedPanelProps) {
  return (
    <div
      role="region"
      aria-label="Saved Routine Checklist"
      className="rounded-xl border border-primary/40 bg-surface-container-low p-4 shadow-xs flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-[15px] text-on-surface flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{title || 'Saved Routine Actions'}</span>
        </h2>
        <span className="text-[11px] font-mono text-on-surface-variant">
          {isSignedIn ? 'Synced with Cloud Firestore' : 'Persisted in Guest Mode (localStorage)'}
        </span>
      </div>

      {savedActions.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant italic py-2">
          No saved actions yet. Click &ldquo;Save to Routine&rdquo; on any recommendation card below
          to build your daily protection checklist.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {savedActions.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs flex items-start justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[13px] text-on-surface leading-tight">
                  {item.headline}
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                  {item.action}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAction(item.id)}
                aria-label={`Remove saved action ${item.headline}`}
                className="p-1.5 text-on-surface-variant hover:text-error rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
