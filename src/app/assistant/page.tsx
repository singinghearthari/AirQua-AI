'use client';

import React from 'react';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import GroundedChatPanel from '@/components/chat/GroundedChatPanel';

export default function AssistantPage() {
  const { persona, language, t } = useAirqua();

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Card */}
      <section
        aria-label="AI Consultant Overview"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden border border-outline-variant/60 shadow-xs shrink-0 bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpeg"
                alt="AIRQUA AI Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-[22px] sm:text-[24px] text-on-surface tracking-tight">
                {t.consultant.heading}
              </h1>
              <span className="text-[11px] font-mono font-semibold text-primary">
                Bilingual Voice Assistant (English &amp; தமிழ்)
              </span>
            </div>
          </div>
          <p className="text-[13px] text-on-surface-variant max-w-2xl leading-relaxed">
            Get scientifically grounded air-quality recommendations tailored to your daily routine.
            Includes live Web Speech voice input and natural speech readout, verified against
            Copernicus and CPCB telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-medium text-on-surface border border-outline-variant">
            <Mic className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Voice Active ({language === 'ta' ? 'தமிழ்' : 'English'})</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-medium text-on-primary-container border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{t.personas[persona] || persona}</span>
          </span>
        </div>
      </section>

      {/* 2. Grounded Chat Panel */}
      <section aria-label="Interactive Air Quality Consultant">
        <GroundedChatPanel />
      </section>
    </div>
  );
}
