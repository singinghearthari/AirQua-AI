'use client';

import React from 'react';
import { ArrowRight, BookmarkPlus, Bot, Check, Leaf } from 'lucide-react';
import { ImpactSimulationResult } from '@/types/airqua';

interface SimulatorCommitBarProps {
  activeCount: number;
  emissionsImpact: ImpactSimulationResult['emissionsImpact'];
  isSavedToPlan: boolean;
  onAskAIConsultant: () => void;
  onCommitSwaps: () => void;
}

export default function SimulatorCommitBar({
  activeCount,
  emissionsImpact,
  isSavedToPlan,
  onAskAIConsultant,
  onCommitSwaps,
}: SimulatorCommitBarProps) {
  if (activeCount === 0) return null;

  return (
    <section
      aria-label="Commit Routine Swaps to Today's Plan"
      className="rounded-xl border border-primary/30 bg-primary-container/20 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      <div className="flex flex-col text-center sm:text-left">
        <span className="font-bold text-[14px] text-on-surface flex items-center gap-2 justify-center sm:justify-start">
          <span>Commit to these {activeCount} Simulated Swaps?</span>
          {emissionsImpact.co2eMaxKg > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20">
              <Leaf className="h-3 w-3" aria-hidden="true" />
              {emissionsImpact.co2eMinKg.toFixed(2)}–{emissionsImpact.co2eMaxKg.toFixed(2)}{' '}
              {emissionsImpact.unit} saved
            </span>
          )}
        </span>
        <span className="text-[12px] text-on-surface-variant mt-0.5">
          Add to Today&apos;s Saved Routine checklist to track your personal exposure and emissions
          progress.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onAskAIConsultant}
          aria-label="Ask AI Consultant about this routine plan in assistant"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-surface hover:bg-surface-container px-3.5 py-2 text-[12px] font-semibold text-primary transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
          <span>Ask AI Consultant</span>
          <ArrowRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onCommitSwaps}
          disabled={isSavedToPlan}
          aria-label="Commit swaps to today's plan checklist"
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
            isSavedToPlan
              ? 'bg-emerald-600 text-white cursor-default'
              : 'bg-primary hover:bg-primary/90 text-on-primary'
          }`}
        >
          {isSavedToPlan ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Added to Routine!</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              <span>Commit Swaps to Today&apos;s Plan</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
