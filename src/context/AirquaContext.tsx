'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AirQualitySnapshot,
  AqiScale,
  CityPreset,
  HouseholdPersona,
  SafeWindowSummary,
  SupportedLanguage,
} from '@/types/airqua';
import { EVALUATOR_PRESETS, FEATURED_CITIES } from '@/lib/constants';
import { DICTIONARY, getDictionary } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/shared/AuthModal';
import RoutineDrawer from '@/components/shared/RoutineDrawer';
import { CheckCircle2 } from 'lucide-react';
import {
  getUserPreferences,
  saveUserPreferences,
  syncSavedActions,
  saveActionToFirestore,
  removeActionFromFirestore,
} from '@/lib/firebase/userStore';

export interface SavedActionItem {
  id: string;
  headline: string;
  action: string;
  period: string;
  savedAt: string;
  completed?: boolean;
  sourceScreen?: 'ROOM_SCAN' | 'SIMULATOR' | 'ASSISTANT' | 'DASHBOARD';
}

interface AirquaContextType {
  city: CityPreset;
  setCity: (city: CityPreset) => void;
  persona: HouseholdPersona;
  setPersona: (persona: HouseholdPersona) => void;
  scale: AqiScale;
  setScale: (scale: AqiScale) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  simulateStale: boolean;
  setSimulateStale: (stale: boolean) => void;
  snapshot: AirQualitySnapshot | null;
  safeWindows: SafeWindowSummary | null;
  isLoadingAir: boolean;
  airError: string | null;
  refreshAirData: () => Promise<void>;
  useGpsLocation: () => void;
  isGpsLoading: boolean;
  gpsError: string | null;
  applyEvaluatorPreset: (presetId: string) => void;
  savedActions: SavedActionItem[];
  saveAction: (item: Omit<SavedActionItem, 'id' | 'savedAt'>) => void;
  removeAction: (id: string) => void;
  toggleActionCompleted: (id: string) => void;
  clearCompletedActions: () => void;
  isRoutineDrawerOpen: boolean;
  setIsRoutineDrawerOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
  openAuthModal: (tab?: 'signin' | 'signup') => void;
  t: (typeof DICTIONARY)['en'];
}

const AirquaContext = createContext<AirquaContextType | null>(null);

const STORAGE_SAVED_ACTIONS = 'airqua_saved_actions_v2';
const STORAGE_PREFS = 'airqua_user_prefs_v2';

export function AirquaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Lazy state initializers to avoid setState inside initial render effects
  const [city, setCity] = useState<CityPreset>(() => {
    if (typeof window === 'undefined') return FEATURED_CITIES[0];
    try {
      const stored = localStorage.getItem(STORAGE_PREFS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.city) return parsed.city;
      }
    } catch {}
    return FEATURED_CITIES[0];
  }); // Default: Delhi (zero login wall)

  const [persona, setPersona] = useState<HouseholdPersona>(() => {
    if (typeof window === 'undefined') return 'FAMILY_KIDS';
    try {
      const stored = localStorage.getItem(STORAGE_PREFS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.persona) return parsed.persona;
      }
    } catch {}
    return 'FAMILY_KIDS';
  });

  const [scale, setScale] = useState<AqiScale>(() => {
    if (typeof window === 'undefined') return 'IN_CPCB';
    try {
      const stored = localStorage.getItem(STORAGE_PREFS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.scale) return parsed.scale;
      }
    } catch {}
    return 'IN_CPCB';
  });

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = localStorage.getItem(STORAGE_PREFS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.language) return parsed.language;
      }
    } catch {}
    return 'en';
  });

  const [simulateStale, setSimulateStale] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [safeWindows, setSafeWindows] = useState<SafeWindowSummary | null>(null);
  const [isLoadingAir, setIsLoadingAir] = useState<boolean>(true);
  const [airError, setAirError] = useState<string | null>(null);

  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [savedActions, setSavedActions] = useState<SavedActionItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_ACTIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync preferences and actions with Cloud Firestore on user sign-in
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    // Restore preferences from Firestore
    getUserPreferences(user.uid)
      .then((remotePrefs) => {
        if (!active || !remotePrefs) return;
        if (remotePrefs.city) setCity(remotePrefs.city);
        if (remotePrefs.persona) setPersona(remotePrefs.persona);
        if (remotePrefs.scale) setScale(remotePrefs.scale);
        if (remotePrefs.language) setLanguage(remotePrefs.language);
      })
      .catch((err) => {
        console.warn('Failed to load remote preferences:', err);
      });

    // Sync and migrate saved actions with Firestore
    syncSavedActions(user.uid, savedActions)
      .then((merged) => {
        if (!active) return;
        setSavedActions(merged);
        try {
          localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(merged));
        } catch {}
      })
      .catch((err) => {
        console.warn('Failed to sync actions with Firestore:', err);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Persist preferences changes to localStorage and Firestore
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PREFS,
        JSON.stringify({ city, persona, scale, language })
      );
    } catch {}

    if (user?.uid) {
      saveUserPreferences(user.uid, { city, persona, scale, language }).catch((err) => {
        console.warn('Failed to sync preferences to Firestore:', err);
      });
    }
  }, [city, persona, scale, language, user?.uid]);

  // Fetch air quality telemetry asynchronously
  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    const params = new URLSearchParams({
      lat: city.latitude.toString(),
      lon: city.longitude.toString(),
      name: city.name,
      region: city.region,
      scale,
      persona,
      simulateStale: simulateStale ? 'true' : 'false',
    });

    fetch(`/api/air-quality?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (isCurrent) {
          setSnapshot(data.snapshot);
          setSafeWindows(data.safeWindows);
          setAirError(null);
          setIsLoadingAir(false);
        }
      })
      .catch((err) => {
        if (isCurrent && err.name !== 'AbortError') {
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

  const [isRoutineDrawerOpen, setIsRoutineDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // GPS Geolocation handler wired to /api/reverse-geocode
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

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            setCity({
              name: data.name || 'Current Location',
              region: data.region || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
              countryCode: 'IN',
              latitude: lat,
              longitude: lon,
            });
            showToast(`Located: ${data.name}`);
          } else {
            setCity({
              name: 'My Current Location',
              region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
              latitude: lat,
              longitude: lon,
            });
          }
        } catch {
          setCity({
            name: 'My Current Location',
            region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
            latitude: lat,
            longitude: lon,
          });
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
  }, [showToast]);

  // Apply 1-Click Evaluator Presets
  const applyEvaluatorPreset = useCallback((presetId: string) => {
    const preset = EVALUATOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCity(preset.city);
      setPersona(preset.persona);
      setScale(preset.scale);
      setSimulateStale(false);
      showToast(`Evaluator Preset: ${preset.label}`);
    }
  }, [showToast]);

  // Action checklist management
  const saveAction = useCallback(
    (item: Omit<SavedActionItem, 'id' | 'savedAt'>) => {
      const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newItem: SavedActionItem = {
        ...item,
        id: newId,
        savedAt: new Date().toISOString(),
        completed: false,
      };

      setSavedActions((prev) => {
        const exists = prev.some((a) => a.action === item.action);
        if (exists) return prev;
        const updated = [newItem, ...prev];
        try {
          localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      showToast("Added to Today's Plan");

      if (user?.uid) {
        saveActionToFirestore(user.uid, newItem).catch((err) =>
          console.warn('Failed to save action to Firestore:', err)
        );
      }
    },
    [user, showToast]
  );

  const toggleActionCompleted = useCallback(
    (id: string) => {
      setSavedActions((prev) => {
        const updated = prev.map((a) =>
          a.id === id ? { ...a, completed: !a.completed } : a
        );
        try {
          localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const clearCompletedActions = useCallback(() => {
    setSavedActions((prev) => {
      const updated = prev.filter((a) => !a.completed);
      try {
        localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Cleared completed actions');
  }, [showToast]);

  const removeAction = useCallback(
    (id: string) => {
      setSavedActions((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        try {
          localStorage.setItem(STORAGE_SAVED_ACTIONS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (user?.uid) {
        removeActionFromFirestore(user.uid, id).catch((err) =>
          console.warn('Failed to remove action from Firestore:', err)
        );
      }
    },
    [user]
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = useCallback((tab: 'signin' | 'signup' = 'signin') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const t = useMemo(() => getDictionary(language), [language]);

  const value = {
    city,
    setCity,
    persona,
    setPersona,
    scale,
    setScale,
    language,
    setLanguage,
    simulateStale,
    setSimulateStale,
    snapshot,
    safeWindows,
    isLoadingAir,
    airError,
    refreshAirData,
    useGpsLocation,
    isGpsLoading,
    gpsError,
    applyEvaluatorPreset,
    savedActions,
    saveAction,
    removeAction,
    toggleActionCompleted,
    clearCompletedActions,
    isRoutineDrawerOpen,
    setIsRoutineDrawerOpen,
    showToast,
    openAuthModal,
    t,
  };

  return (
    <AirquaContext.Provider value={value}>
      {children}
      <AuthModal
        key={`${isAuthModalOpen}-${authModalTab}`}
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <RoutineDrawer
        isOpen={isRoutineDrawerOpen}
        onClose={() => setIsRoutineDrawerOpen(false)}
      />
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-primary/30 bg-surface-container-lowest px-4 py-3 shadow-xl flex items-center gap-2.5 text-[13px] font-semibold text-on-surface animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </AirquaContext.Provider>
  );
}

export function useAirqua() {
  const context = useContext(AirquaContext);
  if (!context) {
    throw new Error('useAirqua must be used within an AirquaProvider');
  }
  return context;
}
