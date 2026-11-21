'use client';

import React from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Moon,
  Sun,
  Sunrise,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { DayPeriodPlan } from '@/types/airqua';
import { PERSONA_LABELS } from '@/lib/constants';

export default function DailyPeriodPlanner() {
  const { safeWindows, persona, language, savedActions, saveAction, removeAction, t } =
    useAirqua();

  if (!safeWindows || safeWindows.dailyPeriods.length === 0) {
    return null;
  }

  const personaMeta = PERSONA_LABELS[persona];
  const personaDisplay = language === 'ta' ? personaMeta.ta : personaMeta.en;

  const getRiskBadge = (risk: DayPeriodPlan['riskLevel']) => {
    switch (risk) {
      case 'LOW':
        return {
          badge: 'bg-aqi-good-container text-on-aqi-good-container border-aqi-good/30',
          dot: 'bg-aqi-good',
          label: 'Low Risk',
        };
      case 'MODERATE':
        return {
          badge: 'bg-aqi-moderate-container text-on-aqi-moderate-container border-aqi-moderate/30',
          dot: 'bg-aqi-moderate',
          label: 'Moderate Caution',
        };
      case 'HIGH':
        return {
          badge: 'bg-aqi-severe-container text-on-aqi-severe-container border-aqi-severe/30',
          dot: 'bg-aqi-severe',
          label: 'High Risk (Inversion)',
        };
      default:
        return {
          badge: 'bg-surface-container text-on-surface-variant border-outline-variant',
          dot: 'bg-outline',
          label: 'Uncertain',
        };
    }
  };

  const getPeriodIcon = (period: DayPeriodPlan['period']) => {
    switch (period) {
      case 'MORNING':
        return <Sunrise className="h-5 w-5 text-aqi-severe shrink-0" aria-hidden="true" />;
      case 'AFTERNOON':
        return <Sun className="h-5 w-5 text-aqi-good shrink-0" aria-hidden="true" />;
      case 'EVENING':
        return <Moon className="h-5 w-5 text-aqi-poor shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <section aria-labelledby="persona-planner-heading" className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2
            id="persona-planner-heading"
            className="font-display font-bold text-[18px] text-on-surface"
          >
            {t.dashboard.plannerHeading} — {personaDisplay}
          </h2>
          <p className="text-[13px] text-on-surface-variant">
            {t.dashboard.plannerSub}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {safeWindows.dailyPeriods.map((plan) => {
          const risk = getRiskBadge(plan.riskLevel);
          const isMidday = plan.period === 'AFTERNOON';

          // Check if this action is already saved in the user's checklist
          const existingAction = savedActions.find(
            (a) => a.action === plan.personaAction
          );
          const isSaved = Boolean(existingAction);

          return (
            <article
              key={plan.period}
              className={`h-full rounded-xl border bg-surface-container-lowest p-5 flex flex-col justify-between gap-4 shadow-xs transition-shadow hover:shadow-sm ${
                isMidday ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              <div className="flex flex-col gap-3">
                {/* Period Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getPeriodIcon(plan.period)}
                    <h3 className="font-display font-semibold text-[16px] text-on-surface">
                      {plan.period === 'MORNING'
                        ? 'Morning Window'
                        : plan.period === 'AFTERNOON'
                        ? 'Midday Safe Window'
                        : 'Evening Peak'}
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    {plan.timeRange}
                  </span>
                </div>

                {/* Risk Level Badge & Estimated PM2.5 */}
                <div className="flex items-center gap-2">
                  <span
                    role="status"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${risk.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} aria-hidden="true" />
                    <span>{risk.label}</span>
                  </span>
                  {plan.avgPm25 !== null && (
                    <span className="font-mono text-[11px] text-on-surface-variant tabular-nums">
                      Avg PM2.5: {plan.avgPm25} µg/m³
                    </span>
                  )}
                </div>

                {/* Action Headline & Guidance */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-sans font-semibold text-[15px] text-on-surface leading-snug">
                    {plan.headline}
                  </h4>
                  <p className="text-[13px] leading-relaxed text-on-surface-variant">
                    {plan.personaAction}
                  </p>
                </div>

                {/* "Why It Matters" Scientific Justification */}
                <div className="rounded-md border border-outline-variant/60 bg-surface-container-low p-2.5 text-[12px] text-on-surface-variant flex flex-col gap-0.5">
                  <span className="font-semibold text-on-surface text-[11px] uppercase tracking-wider">
                    Why It Matters:
                  </span>
                  <p className="leading-relaxed">{plan.whyItMatters}</p>
                </div>
              </div>

              {/* Card Footer: Save to Action Plan */}
              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-on-surface-variant italic">
                  Tailored to {personaDisplay}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (isSaved && existingAction) {
                      removeAction(existingAction.id);
                    } else {
                      saveAction({
                        headline: plan.headline,
                        action: plan.personaAction,
                        period: plan.period,
                      });
                    }
                  }}
                  aria-label={
                    isSaved ? 'Remove from action plan' : t.dashboard.saveAction
                  }
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isSaved
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant bg-surface hover:border-primary hover:text-primary text-on-surface'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.dashboard.actionSaved}</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.dashboard.saveAction}</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
