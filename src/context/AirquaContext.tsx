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
import { EVALUATOR_PRESETS } from '@/lib/constants';
import { DICTIONARY, getDictionary } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/shared/AuthModal';
import RoutineDrawer from '@/components/shared/RoutineDrawer';
import { CheckCircle2 } from 'lucide-react';
import {
  loadStoredPreferences,
  persistPreferences,
} from '@/lib/storage/airquaStorage';
import { getUserPreferences, saveUserPreferences } from '@/lib/firebase/userStore';
import { useGpsCityResolver } from '@/hooks/useGpsCityResolver';
import { useAirQualityTelemetry } from '@/hooks/useAirQualityTelemetry';
import { useSavedActions } from '@/hooks/useSavedActions';

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

export function AirquaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initialPrefs = useMemo(() => loadStoredPreferences(), []);

  const [city, setCity] = useState<CityPreset>(initialPrefs.city);
  const [persona, setPersona] = useState<HouseholdPersona>(initialPrefs.persona);
  const [scale, setScale] = useState<AqiScale>(initialPrefs.scale);
  const [language, setLanguage] = useState<SupportedLanguage>(initialPrefs.language);
  const [simulateStale, setSimulateStale] = useState<boolean>(false);
  const [isRoutineDrawerOpen, setIsRoutineDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 3200);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    getUserPreferences(user.uid)
      .then((remotePrefs) => {
        if (!active || !remotePrefs) return;
        if (remotePrefs.city) setCity(remotePrefs.city);
        if (remotePrefs.persona) setPersona(remotePrefs.persona);
        if (remotePrefs.scale) setScale(remotePrefs.scale);
        if (remotePrefs.language) setLanguage(remotePrefs.language);
      })
      .catch((err) => console.warn('Failed to load remote preferences:', err));

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    persistPreferences({ city, persona, scale, language });
    if (user?.uid) {
      saveUserPreferences(user.uid, { city, persona, scale, language }).catch((err) =>
        console.warn('Failed to sync preferences to Firestore:', err)
      );
    }
  }, [city, persona, scale, language, user?.uid]);

  const { snapshot, safeWindows, isLoadingAir, airError, refreshAirData } =
    useAirQualityTelemetry({ city, scale, persona, simulateStale });
  const { useGpsLocation, isGpsLoading, gpsError } = useGpsCityResolver(setCity, showToast);
  const actionsState = useSavedActions(user?.uid, showToast);

  const applyEvaluatorPreset = useCallback(
    (presetId: string) => {
      const preset = EVALUATOR_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setCity(preset.city);
      setPersona(preset.persona);
      setScale(preset.scale);
      setSimulateStale(false);
      showToast(`Evaluator Preset: ${preset.label}`);
    },
    [showToast]
  );

  const openAuthModal = useCallback((tab: 'signin' | 'signup' = 'signin') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const t = useMemo(() => getDictionary(language), [language]);

  const value: AirquaContextType = {
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
    ...actionsState,
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

/**
 * Returns the active AIRQUA global context including city, persona, AQI telemetry, and saved routine actions.
 */
export function useAirqua() {
  const context = useContext(AirquaContext);
  if (!context) throw new Error('useAirqua must be used within an AirquaProvider');
  return context;
}
