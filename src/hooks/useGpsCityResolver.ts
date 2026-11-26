import { useCallback, useState } from 'react';
import { CityPreset } from '@/types/airqua';

/**
 * Provides browser GPS geolocation lookup wired to `/api/reverse-geocode`.
 */
export function useGpsCityResolver(
  onResolved: (city: CityPreset) => void,
  onToast: (msg: string) => void
) {
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const useGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const fallbackCity: CityPreset = {
          name: 'My Current Location',
          region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
          latitude: lat,
          longitude: lon,
        };

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = (await res.json()) as { name?: string; region?: string };
            onResolved({
              name: data.name || 'Current Location',
              region: data.region || fallbackCity.region,
              countryCode: 'IN',
              latitude: lat,
              longitude: lon,
            });
            onToast(`Located: ${data.name || 'Current Location'}`);
          } else {
            onResolved(fallbackCity);
          }
        } catch (err) {
          console.warn('[useGpsCityResolver] Reverse geocode lookup failed, falling back to coordinates:', err);
          onResolved(fallbackCity);
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        setGpsError(err.message || 'Unable to retrieve your location.');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [onResolved, onToast]);

  return { useGpsLocation, isGpsLoading, gpsError };
}
