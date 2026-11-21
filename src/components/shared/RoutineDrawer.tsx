'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useAirqua } from '@/context/AirquaContext';

interface RoutineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoutineDrawer({ isOpen, onClose }: RoutineDrawerProps) {
  const { savedActions, removeAction, toggleActionCompleted, clearCompletedActions } =
    useAirqua();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = savedActions.length;
  const completedCount = savedActions.filter((a) => a.completed).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Today's Saved Routine Plan"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200"
    >
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-md bg-surface-container-lowest border-l border-outline-variant h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between gap-3 bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[18px] text-on-surface tracking-tight">
                Today&apos;s Routine Plan
              </h2>
              <p className="text-[12px] text-on-surface-variant">
                {totalCount === 0
                  ? 'No actions saved yet'
                  : `${completedCount} of ${totalCount} actions completed (${progressPct}%)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close routine drawer"
            className="rounded-full p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="px-5 pt-3 pb-1 bg-surface-container-lowest">
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {totalCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
              <div className="p-4 rounded-2xl bg-primary-container/30 text-primary mb-3">
                <Sparkles className="h-8 w-8" aria-hidden="true" />
              </div>
              <h3 className="font-display font-semibold text-[16px] text-on-surface mb-1">
                Your Routine is Clean
              </h3>
              <p className="text-[13px] leading-relaxed max-w-xs mb-5">
                Save recommended actions from Room Scans, What-If Simulator swaps, or the AI Consultant to track them here.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Link
                  href="/simulator"
                  onClick={onClose}
                  className="inline-flex items-center justify-between rounded-lg border border-outline-variant bg-surface hover:bg-surface-container p-3 text-[12px] font-semibold text-on-surface transition-colors"
                >
                  <span>Simulate Routine Swaps</span>
                  <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                </Link>
                <Link
                  href="/room-scan"
                  onClick={onClose}
                  className="inline-flex items-center justify-between rounded-lg border border-outline-variant bg-surface hover:bg-surface-container p-3 text-[12px] font-semibold text-on-surface transition-colors"
                >
                  <span>Scan Room or Kitchen</span>
                  <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            savedActions.map((item) => {
              const isDone = !!item.completed;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-all flex items-start gap-3 ${
                    isDone
                      ? 'border-outline-variant/60 bg-surface-container-lowest/50 opacity-70'
                      : 'border-outline-variant bg-surface-container-lowest shadow-2xs hover:border-primary/40'
                  }`}
                >
                  {/* Completion Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleActionCompleted(item.id)}
                    aria-label={isDone ? `Mark "${item.headline}" as incomplete` : `Mark "${item.headline}" as complete`}
                    className="mt-0.5 shrink-0 text-primary hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-on-surface-variant hover:text-primary" aria-hidden="true" />
                    )}
                  </button>

                  {/* Action Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[13px] font-bold line-clamp-1 ${
                          isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'
                        }`}
                      >
                        {item.headline}
                      </span>
                      {item.period && (
                        <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/60">
                          {item.period}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[12px] leading-relaxed mb-2 ${
                        isDone ? 'text-on-surface-variant/70' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.action}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(item.savedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAction(item.id)}
                        aria-label={`Delete ${item.headline}`}
                        className="inline-flex items-center gap-1 text-on-surface-variant hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Actions */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-outline-variant/60 bg-surface-container-low/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearCompletedActions}
              disabled={completedCount === 0}
              className="text-[12px] font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Clear Completed ({completedCount})
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Synced Locally &amp; Cloud</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
