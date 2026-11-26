import { SupportedLanguage } from '@/types/airqua';

export interface Translations {
  guestMode: string;
  personaLabel: string;
  searchPlaceholder: string;
  useGps: string;
  tryPreset: string;
  tabs: {
    dashboard: string;
    roomScan: string;
    simulator: string;
    consultant: string;
  };
  personas: Record<string, string>;
  dashboard: {
    heroTitleSuffix: string;
    aqiHeadingSuffix: string;
    freshnessFresh: string;
    freshnessStale: string;
    freshnessUnavailable: string;
    dominantPollutant: string;
    dataProvider: string;
    provider: string;
    providerBlend: string;
    providerSub: string;
    safeWindowHeading: string;
    safeWindowSub: string;
    bestToVentilate: string;
    bestOutdoor: string;
    peakSmog: string;
    timelineHelper: string;
    plannerHeading: string;
    plannerSub: string;
    routineHeadingPrefix: string;
    tailoredGuidance: string;
    pollutantHeading: string;
    pollutantsHeading: string;
    pollutantsSub: string;
    trackedPollutants: string;
    subIndexLabel: string;
    refreshButton: string;
    refreshing: string;
    saveAction: string;
    actionSaved: string;
    staleWarningTitle: string;
    staleWarningBody: string;
    unavailableWarningTitle: string;
    unavailableWarningBody: string;
  };
  roomScan: {
    heading: string;
    sub: string;
    dropTitle: string;
    dropHint: string;
    selectedPrefix: string;
    trySample: string;
    analyzeCta: string;
    analyzingCta: string;
    resultsHeading: string;
    aiGuidance: string;
    mechanismLabel: string;
    fixLabel: string;
    checklistHeading: string;
    sensorDisclaimer: string;
  };
  simulator: {
    heading: string;
    sub: string;
    dualHeading: string;
    noBlendedScore: string;
    cardALabel: string;
    cardBLabel: string;
    exposureBadgeLower: string;
    exposureBadgeNeutral: string;
    dosimetryDisclaimer: string;
    co2SavedUnit: string;
    showMath: string;
    distanceLabel: string;
    occupancyLabel: string;
    savedLabel: string;
  };
  consultant: {
    heading: string;
    liveContextActive: string;
    bestWindowPrefix: string;
    quickPrompts: string[];
    saveAction: string;
    savedAction: string;
    savedPanelTitle: string;
    inputPlaceholder: string;
    send: string;
    sending: string;
    medicalDisclaimer: string;
  };
  footer: {
    outdoorNotIndoor?: string;
    simulateStale?: string;
    disclaimer: string;
    simulateStaleLabel: string;
    builtWith: string;
  };
  appTitle?: string;
  tagline?: string;
  nav: {
    dashboard: string;
    roomScan: string;
    simulator: string;
    assistant: string;
  };
  citySearchPlaceholder?: string;
  gpsButtonLabel?: string;
  gpsLocating?: string;
  personaSwitcherLabel?: string;
  scaleToggleLabel?: string;
  evaluatorPresetLabel?: string;
}

export type TranslationDictionary = Record<SupportedLanguage, Translations>;
