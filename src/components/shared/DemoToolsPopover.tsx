'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FlaskConical, Sparkles, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { EVALUATOR_PRESETS } from '@/lib/constants';

export default function DemoToolsPopover() {
  const { applyEvaluatorPreset, simulateStale, setSimulateStale, city, t } = useAirqua();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Open Evaluator Demo Tools"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
          simulateStale
            ? 'border-error/40 bg-error-container text-on-error-container shadow-2xs'
            : isOpen
            ? 'border-primary/50 bg-primary-container/40 text-primary'
            : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:border-outline'
        }`}
      >
        <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="hidden sm:inline">Demo Tools</span>
        {simulateStale && (
          <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse" aria-hidden="true" />
        )}
        <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Evaluator Demo Controls"
          className="absolute right-0 mt-2 w-80 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xl z-50 flex flex-col gap-3 animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
            <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px]">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>PromptWars Evaluator Presets</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-primary-container text-primary px-1.5 py-0.5 rounded">
              Judge Sandbox
            </span>
          </div>

          {/* 1-Click Presets */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-on-surface-variant px-1">
              Test Scenarios (1-Click)
            </span>
            {EVALUATOR_PRESETS.map((preset) => {
              const isActive = city.name.toLowerCase() === preset.city.name.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    applyEvaluatorPreset(preset.id);
                    setIsOpen(false);
                  }}
                  className={`text-left px-2.5 py-2 rounded-lg text-[12px] transition-colors flex items-start justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary-container/30 border border-primary/30 text-on-surface'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-[12px]">{preset.label}</span>
                    <span className="text-[11px] text-on-surface-variant line-clamp-1">
                      {preset.description}
                    </span>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Simulate Stale Data Toggle */}
          <div className="pt-2 border-t border-outline-variant/60 flex flex-col gap-1.5">
            <label
              htmlFor="demo-simulate-stale-toggle"
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-on-surface flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  Simulate Stale Data (&gt;24h)
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Tests honest offline &amp; fallback banners
                </span>
              </div>
              <input
                id="demo-simulate-stale-toggle"
                type="checkbox"
                checked={simulateStale}
                onChange={(e) => setSimulateStale(e.target.checked)}
                className="h-4 w-4 rounded border-outline text-primary focus:ring-primary cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
