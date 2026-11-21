'use client';

import React from 'react';
import { Sparkles, Activity, Clock, Calculator, ShieldCheck } from 'lucide-react';

export type ProvenanceKind =
  | 'OBSERVED'
  | 'FORECAST'
  | 'ESTIMATE'
  | 'AI_GUIDANCE'
  | 'FALLBACK';

export function mapTagToProvenanceKind(tag: string): ProvenanceKind {
  if (!tag) return 'AI_GUIDANCE';
  if (tag.includes('Observed') || tag.includes('Modeled')) return 'OBSERVED';
  if (tag.includes('Forecast')) return 'FORECAST';
  if (tag.includes('Estimate')) return 'ESTIMATE';
  if (tag.includes('Fallback')) return 'FALLBACK';
  return 'AI_GUIDANCE';
}

interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  className?: string;
}

export default function ProvenanceBadge({ kind, className = '' }: ProvenanceBadgeProps) {
  switch (kind) {
    case 'OBSERVED':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-mono font-medium ${className}`}
        >
          <Activity className="h-3 w-3" aria-hidden="true" />
          <span>Observed / Modeled</span>
        </span>
      );

    case 'FORECAST':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 text-[10px] font-mono font-medium ${className}`}
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>24h Forecast</span>
        </span>
      );

    case 'ESTIMATE':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-mono font-medium ${className}`}
        >
          <Calculator className="h-3 w-3" aria-hidden="true" />
          <span>Deterministic Estimate</span>
        </span>
      );

    case 'FALLBACK':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant px-2 py-0.5 text-[10px] font-mono font-medium ${className}`}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          <span>Verified Guidance</span>
        </span>
      );

    case 'AI_GUIDANCE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-primary-container text-on-primary-container border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-medium ${className}`}
        >
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          <span>AI Guidance • Grounded</span>
        </span>
      );
  }
}
