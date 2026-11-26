'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[AppGlobalError]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-6 font-sans antialiased">
        <main
          id="main-content"
          role="alert"
          className="max-w-lg w-full rounded-2xl border border-red-300 bg-white p-8 shadow-lg flex flex-col items-start gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-100 text-red-700 shrink-0">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
                AIRQUA AI experienced a critical error
              </h1>
              <p className="text-[12px] text-slate-600">
                Application shell recovery mode
              </p>
            </div>
          </div>

          <p className="text-[14px] text-slate-700 leading-relaxed">
            {error.message || 'An unexpected application error occurred. You can retry safely below.'}
          </p>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:outline-none cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Try again</span>
          </button>
        </main>
      </body>
    </html>
  );
}
