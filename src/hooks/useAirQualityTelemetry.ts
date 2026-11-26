import { useCallback, useEffect, useState } from 'react';
import {
  AirQualitySnapshot,
  AqiScale,
  CityPreset,
  HouseholdPersona,
  SafeWindowSummary,
} from '@/types/airqua';

/**
 * Fetches and caches live Open-Meteo telemetry whenever city, scale, persona,
 * or manual/stale refresh triggers change.
 */
export function useAirQualityTelemetry(params: {
  city: CityPreset;
  scale: AqiScale;
  persona: HouseholdPersona;
  simulateStale: boolean;
}) {
  const { city, scale, persona, simulateStale } = params;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [safeWindows, setSafeWindows] = useState<SafeWindowSummary | null>(null);
  const [isLoadingAir, setIsLoadingAir] = useState<boolean>(true);
  const [airError, setAirError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();
    const query = new URLSearchParams({
      lat: city.latitude.toString(),
      lon: city.longitude.toString(),
      name: city.name,
      region: city.region,
      scale,
      persona,
      simulateStale: simulateStale ? 'true' : 'false',
    });

    fetch(`/api/air-quality?${query.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err: { error?: string }) => {
            throw new Error(err.error || `HTTP ${res.status}`);
          });
        }
        return res.json() as Promise<{ snapshot: AirQualitySnapshot; safeWindows: SafeWindowSummary }>;
      })
      .then((data) => {
        if (!isCurrent) return;
        setSnapshot(data.snapshot);
        setSafeWindows(data.safeWindows);
        setAirError(null);
        setIsLoadingAir(false);
      })
      .catch((err: unknown) => {
        if (isCurrent && (err as Error)?.name !== 'AbortError') {
          console.error('Failed to fetch air quality data:', err);
          setAirError(err instanceof Error ? err.message : 'Telemetry request failed');
          setIsLoadingAir(false);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [city, scale, persona, simulateStale, refreshTrigger]);

  const refreshAirData = useCallback(async () => {
    setIsLoadingAir(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { snapshot, safeWindows, isLoadingAir, airError, refreshAirData };
}
