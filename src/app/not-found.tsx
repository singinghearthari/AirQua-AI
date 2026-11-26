import React from 'react';
import Link from 'next/link';
import { Compass, Home, MessageSquare } from 'lucide-react';

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-heading"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 sm:p-10 shadow-xs flex flex-col items-center text-center gap-4 max-w-xl mx-auto my-8"
    >
      <span className="p-3 rounded-2xl bg-primary-container text-primary">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </span>

      <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-primary px-2.5 py-0.5 rounded-full bg-primary-container/60">
        404 • Route Not Found
      </span>

      <h1
        id="not-found-heading"
        className="font-display font-bold text-[24px] text-on-surface tracking-tight"
      >
        This AIRQUA page does not exist
      </h1>

      <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-md">
        The route you requested could not be found. Return to the live AQI dashboard to view
        24-hour safe ventilation windows, scan a room, or consult AIRQUA AI.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 text-[13px] font-semibold transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Go to Dashboard</span>
        </Link>

        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Ask AI Consultant</span>
        </Link>
      </div>
    </section>
  );
}
