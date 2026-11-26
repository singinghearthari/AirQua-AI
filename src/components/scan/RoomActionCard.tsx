'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TIMEOUTS_MS } from '@/lib/config/timeouts';
import {
  Bed,
  BookmarkPlus,
  CheckCircle,
  CloudFog,
  Compass,
  Home,
  ShieldAlert,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';
import { RoomScanResult } from '@/types/airqua';
import { useAirqua } from '@/context/AirquaContext';
import FindingItemCard from './FindingItemCard';

interface RoomActionCardProps {
  result: RoomScanResult;
}

function renderSceneIcon(type: string) {
  switch (type) {
    case 'KITCHEN':
      return <Utensils className="h-5 w-5" aria-hidden="true" />;
    case 'BEDROOM':
      return <Bed className="h-5 w-5" aria-hidden="true" />;
    case 'LIVING_AREA':
      return <Home className="h-5 w-5" aria-hidden="true" />;
    case 'OUTDOOR_SKY':
      return <CloudFog className="h-5 w-5" aria-hidden="true" />;
    default:
      return <Compass className="h-5 w-5" aria-hidden="true" />;
  }
}

export default function RoomActionCard({ result }: RoomActionCardProps) {
  const { saveAction, t } = useAirqua();
  const [completedChecklist, setCompletedChecklist] = useState<Record<number, boolean>>({});
  const [savedToPlan, setSavedToPlan] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const toggleChecklistItem = (idx: number) => {
    setCompletedChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSaveToPlan = () => {
    result.findings.forEach((finding) => {
      saveAction({
        headline: `[${finding.riskLevel} Risk] ${finding.item}`,
        action: finding.practicalFix,
        period: result.sceneType,
      });
    });
    setSavedToPlan(true);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = setTimeout(() => {
      setSavedToPlan(false);
      savedTimerRef.current = null;
    }, TIMEOUTS_MS.SAVED_BADGE_RESET);
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Room and Smog Audit Results"
      className="flex flex-col gap-6"
    >
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-container text-on-primary-container">
              {renderSceneIcon(result.sceneType)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
                  Detected Scene
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-mono text-on-surface-variant">
                  <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                  AI Visual Guidance
                </span>
                {result.aiProvider === 'groq-backup' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold">
                    <Zap className="h-3 w-3 text-amber-500" aria-hidden="true" />
                    Backup Engine: Groq
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-mono text-on-surface-variant">
                    Powered by Gemini
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-[18px] text-on-surface">
                {result.sceneType.replace('_', ' ')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveToPlan}
            disabled={savedToPlan}
            aria-label="Save audit recommendations to daily routine checklist"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              savedToPlan
                ? 'bg-aqi-good text-on-aqi-good'
                : 'bg-primary text-on-primary hover:bg-primary/90'
            }`}
          >
            {savedToPlan ? (
              <>
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>Saved to Daily Plan</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                <span>Save Findings to Plan</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[13px] text-on-surface leading-relaxed bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/60">
          <strong className="font-semibold text-on-surface">Visual Overview: </strong>
          {result.confidenceNote}
        </p>
      </div>

      <div
        role="note"
        aria-label="Sensor Boundary Notice"
        className="rounded-xl border border-primary/40 bg-primary-container/20 p-4 text-on-primary-container flex items-start gap-3 shadow-xs"
      >
        <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex flex-col gap-1 text-[12px] leading-relaxed">
          <span className="font-bold text-[13px] text-on-surface">
            Scientific Guardrail • Qualitative Guidance Only
          </span>
          <p className="text-on-surface-variant">
            {result.sensorBoundaryNotice ||
              'Visual analysis provides qualitative airflow and ventilation guidance. Direct indoor air quality monitoring requires a physical indoor sensor.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[16px] text-on-surface">
            Prioritized Risk Findings &amp; Practical Fixes
          </h3>
          <span className="text-[11px] font-mono text-on-surface-variant">
            {result.findings.length} Factors Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.findings.map((finding, idx) => (
            <FindingItemCard
              key={idx}
              finding={finding}
              mechanismLabel={t.roomScan.mechanismLabel}
              fixLabel={t.roomScan.fixLabel}
            />
          ))}
        </div>
      </div>

      {result.quickChecklist && result.quickChecklist.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-[16px] text-on-surface">
              {t.roomScan.checklistHeading}
            </h3>
            <span className="text-[11px] font-mono text-on-surface-variant">
              {Object.values(completedChecklist).filter(Boolean).length} of{' '}
              {result.quickChecklist.length} completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {result.quickChecklist.map((item, idx) => {
              const isChecked = Boolean(completedChecklist[idx]);
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    isChecked
                      ? 'border-aqi-good/40 bg-aqi-good-container/20 text-on-surface'
                      : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleChecklistItem(idx)}
                    aria-label={`Checklist item: ${item}`}
                    className="mt-0.5 h-4 w-4 rounded border-outline text-primary focus:ring-primary focus:ring-offset-0 shrink-0"
                  />
                  <span
                    className={`text-[13px] leading-snug ${
                      isChecked ? 'line-through text-on-surface-variant' : 'font-medium'
                    }`}
                  >
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
