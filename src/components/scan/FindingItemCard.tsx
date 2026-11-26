'use client';

import React from 'react';
import { AlertTriangle, Tag } from 'lucide-react';
import { RoomScanResult } from '@/types/airqua';

type RoomScanFinding = RoomScanResult['findings'][number];

interface FindingItemCardProps {
  finding: RoomScanFinding;
  mechanismLabel: string;
  fixLabel: string;
}

function getRiskStyle(risk: 'LOW' | 'MEDIUM' | 'HIGH') {
  switch (risk) {
    case 'HIGH':
      return 'bg-error-container text-on-error-container border-error/30';
    case 'MEDIUM':
      return 'bg-aqi-moderate-container text-on-aqi-moderate-container border-aqi-moderate/30';
    case 'LOW':
      return 'bg-aqi-good-container text-on-aqi-good-container border-aqi-good/30';
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

export default function FindingItemCard({
  finding,
  mechanismLabel,
  fixLabel,
}: FindingItemCardProps) {
  const riskStyle = getRiskStyle(finding.riskLevel);
  const cost = getCostBadge(finding.estimatedCost);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${riskStyle}`}
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

        <h4 className="font-bold text-[15px] text-on-surface leading-snug">
          {finding.item}
        </h4>

        <div className="text-[12px] text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface font-semibold">{mechanismLabel} </strong>
          {finding.mechanism}
        </div>
      </div>

      <div className="rounded-lg bg-surface-container-low border border-outline-variant/60 p-3 text-[12px] text-on-surface flex flex-col gap-1">
        <span className="font-semibold text-primary text-[11px] uppercase tracking-wider">
          {fixLabel}
        </span>
        <p className="leading-relaxed font-medium">{finding.practicalFix}</p>
      </div>
    </div>
  );
}
