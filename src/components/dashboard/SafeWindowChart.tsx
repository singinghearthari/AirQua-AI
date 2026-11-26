'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

export interface SafeWindowChartDatum {
  hour: string;
  fullTime: string;
  pm25: number;
  pm10: number;
  ventilationStatus: string;
  outdoorStatus: string;
  hourISO: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: SafeWindowChartDatum }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const data = payload?.[0]?.payload;
  if (!active || !data) return null;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-xl text-[12px] flex flex-col gap-2 min-w-[200px] z-50">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 font-bold text-on-surface">
        <span>{data.fullTime}</span>
        <span className="font-mono text-primary">{data.pm25} µg/m³</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-on-surface-variant">Ventilation:</span>
          <span
            className={`font-bold ${
              data.ventilationStatus === 'BEST'
                ? 'text-emerald-600 dark:text-emerald-400'
                : data.ventilationStatus === 'CAUTION'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {data.ventilationStatus === 'BEST'
              ? 'Safe Window (Open)'
              : data.ventilationStatus === 'CAUTION'
                ? 'Caution (Brief)'
                : 'Avoid (Seal)'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-on-surface-variant">Outdoor:</span>
          <span
            className={`font-bold ${
              data.outdoorStatus === 'BEST'
                ? 'text-emerald-600 dark:text-emerald-400'
                : data.outdoorStatus === 'CAUTION'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {data.outdoorStatus === 'BEST'
              ? 'Optimal'
              : data.outdoorStatus === 'CAUTION'
                ? 'Light Only'
                : 'Hazardous'}
          </span>
        </div>

        {data.pm10 > 0 && (
          <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono pt-1 border-t border-outline-variant/40">
            <span>Coarse PM10:</span>
            <span>{data.pm10} µg/m³</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SafeWindowChartProps {
  chartData: SafeWindowChartDatum[];
  isMounted: boolean;
  ventStart: string | null;
  ventEnd: string | null;
  smogStart: string | null;
  smogEnd: string | null;
}

export default function SafeWindowChart({
  chartData,
  isMounted,
  ventStart,
  ventEnd,
  smogStart,
  smogEnd,
}: SafeWindowChartProps) {
  return (
    <div className="w-full h-52 sm:h-60 pt-2" aria-hidden="true">
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {ventStart && ventEnd && (
              <ReferenceArea
                x1={ventStart}
                x2={ventEnd}
                fill="#10b981"
                fillOpacity={0.14}
                stroke="#10b981"
                strokeOpacity={0.3}
                strokeDasharray="3 3"
              />
            )}

            {smogStart && smogEnd && (
              <ReferenceArea
                x1={smogStart}
                x2={smogEnd}
                fill="#ef4444"
                fillOpacity={0.12}
                stroke="#ef4444"
                strokeOpacity={0.3}
                strokeDasharray="3 3"
              />
            )}

            <XAxis
              dataKey="hour"
              stroke="currentColor"
              className="text-[11px] font-mono text-on-surface-variant"
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              stroke="currentColor"
              className="text-[11px] font-mono text-on-surface-variant"
              tickLine={false}
              axisLine={false}
              unit=" µg"
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="pm25"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#pm25Gradient)"
              activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full bg-surface-container-low/40 rounded-xl animate-pulse" />
      )}
    </div>
  );
}
