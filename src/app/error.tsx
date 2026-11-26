'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SegmentError({ error, reset }: SegmentErrorProps) {
  useEffect(() => {
    console.error('[AppSegmentError]:', error);
  }, [error]);

  return (
    <section
      role="alert"
      aria-labelledby="segment-error-heading"
      className="rounded-xl border border-error/40 bg-error-container p-6 sm:p-8 text-on-error-container shadow-xs flex flex-col items-start gap-4"
    >
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-error/15 text-error shrink-0">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1
            id="segment-error-heading"
            className="font-display font-bold text-[20px] tracking-tight"
          >
            Something went wrong loading this view
          </h1>
          <p className="text-[12px] font-mono opacity-80">
            AIRQUA AI encountered an unexpected client or network error.
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed max-w-xl">
        {error.message || 'An unexpected interruption prevented this view from rendering.'}
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-on-error-container text-error-container px-4 py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Try again</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-on-error-container/30 px-4 py-2 text-[13px] font-semibold hover:bg-on-error-container/10 transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </section>
  );
}
