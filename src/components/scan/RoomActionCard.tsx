'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  BookmarkPlus,
  Sparkles,
  Utensils,
  Bed,
  Home,
  CloudFog,
  Compass,
  Tag,
  Zap,
} from 'lucide-react';
import { RoomScanResult } from '@/types/airqua';
import { useAirqua } from '@/context/AirquaContext';

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

function getRiskStyle(risk: 'LOW' | 'MEDIUM' | 'HIGH') {
  switch (risk) {
    case 'HIGH':
      return {
        container: 'bg-error-container text-on-error-container border-error/30',
        badge: 'bg-error text-on-error',
      };
    case 'MEDIUM':
      return {
        container: 'bg-aqi-moderate-container text-on-aqi-moderate-container border-aqi-moderate/30',
        badge: 'bg-aqi-moderate text-on-aqi-moderate',
      };
    case 'LOW':
      return {
        container: 'bg-aqi-good-container text-on-aqi-good-container border-aqi-good/30',
        badge: 'bg-aqi-good text-on-aqi-good',
      };
  }
}

function getCostBadge(cost: 'FREE' | 'LOW_COST' | 'EQUIPMENT') {
  switch (cost) {
    case 'FREE':
      return {
        label: 'Free / Zero Cost',
        style: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    case 'LOW_COST':
      return {
        label: 'Low Cost (< ₹500)',
        style: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    case 'EQUIPMENT':
      return {
        label: 'Appliance / Setup',
        style: 'bg-purple-100 text-purple-800 border-purple-300',
      };
  }
}

export default function RoomActionCard({ result }: RoomActionCardProps) {
  const { saveAction, t } = useAirqua();
  const [completedChecklist, setCompletedChecklist] = useState<Record<number, boolean>>({});
  const [savedToPlan, setSavedToPlan] = useState(false);

  const toggleChecklistItem = (idx: number) => {
    setCompletedChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSaveToPlan = () => {
    // Save highest risk findings to the user's action plan
    result.findings.forEach((finding) => {
      saveAction({
        headline: `[${finding.riskLevel} Risk] ${finding.item}`,
        action: finding.practicalFix,
        period: result.sceneType,
      });
    });
    setSavedToPlan(true);
    setTimeout(() => setSavedToPlan(false), 3000);
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Room and Smog Audit Results"
      className="flex flex-col gap-6"
    >
      {/* 1. Audit Header Card */}
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
              <h3 className="font-display font-bold text-[18px] text-on-surface">
                {result.sceneType.replace('_', ' ')}
              </h3>
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

      {/* 2. Mandatory Scientific Sensor Boundary Notice */}
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

      {/* 3. Prioritized Findings */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-[16px] text-on-surface">
            Prioritized Risk Findings & Practical Fixes
          </h4>
          <span className="text-[11px] font-mono text-on-surface-variant">
            {result.findings.length} Factors Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.findings.map((finding, idx) => {
            const risk = getRiskStyle(finding.riskLevel);
            const cost = getCostBadge(finding.estimatedCost);

            return (
              <div
                key={idx}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${risk.container}`}
                    >
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {finding.riskLevel} RISK
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${cost.style}`}
                    >
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {cost.label}
                    </span>
                  </div>

                  <h5 className="font-bold text-[15px] text-on-surface leading-snug">
                    {finding.item}
                  </h5>

                  {/* Mechanism Explanation */}
                  <div className="text-[12px] text-on-surface-variant leading-relaxed">
                    <strong className="text-on-surface font-semibold">
                      {t.roomScan.mechanismLabel}{' '}
                    </strong>
                    {finding.mechanism}
                  </div>
                </div>

                {/* Practical Fix Callout */}
                <div className="rounded-lg bg-surface-container-low border border-outline-variant/60 p-3 text-[12px] text-on-surface flex flex-col gap-1">
                  <span className="font-semibold text-primary text-[11px] uppercase tracking-wider">
                    {t.roomScan.fixLabel}
                  </span>
                  <p className="leading-relaxed font-medium">{finding.practicalFix}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Action Checklist */}
      {result.quickChecklist && result.quickChecklist.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-[16px] text-on-surface">
              {t.roomScan.checklistHeading}
            </h4>
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
