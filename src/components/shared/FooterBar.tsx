'use client';

import React from 'react';
import { useAirqua } from '@/context/AirquaContext';
import { ShieldCheck, Database, Cpu } from 'lucide-react';

export default function FooterBar() {
  const { simulateStale, setSimulateStale, t } = useAirqua();

  return (
    <footer className="mt-auto border-t border-outline-variant bg-surface-container-low text-on-surface-variant text-[12px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 max-w-2xl text-center sm:text-left">
          <div className="h-8 w-8 rounded-lg overflow-hidden border border-outline-variant/60 shadow-2xs shrink-0 hidden sm:block bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="AIRQUA AI Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="leading-relaxed">
              {t.footer.disclaimer}
            </p>
            <p className="text-[11px] text-on-surface-variant/80">
              {t.footer.builtWith}
            </p>
          </div>
        </div>

        {/* Minimal Provenance & Quality Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-[11px] font-mono text-on-surface-variant">
            <Database className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>Open-Meteo + CAMS</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-[11px] font-mono text-on-surface-variant">
            <Cpu className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>Deterministic Math</span>
          </span>
          {simulateStale && (
            <button
              type="button"
              onClick={() => setSimulateStale(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container border border-error/30 text-[11px] font-semibold text-on-error-container hover:opacity-90 cursor-pointer"
              title="Click to reset simulated stale data mode"
            >
              <span>Stale Demo Mode (Click to Reset)</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
