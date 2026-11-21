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

export const DICTIONARY: Record<SupportedLanguage, Translations> = {
  en: {
    guestMode: 'Guest Mode',
    personaLabel: 'Persona:',
    searchPlaceholder: 'Search any Indian city...',
    useGps: 'Use current GPS location',
    tryPreset: 'Try: Delhi • Family',
    appTitle: 'AIRQUA AI',
    tagline: 'Understand the air. Make informed choices. Build cleaner communities.',
    nav: {
      dashboard: 'Live Air & Plan',
      roomScan: 'Room & Smog Scan',
      simulator: 'What-If Simulator',
      assistant: 'AI Consultant',
    },
    tabs: {
      dashboard: 'Dashboard',
      roomScan: 'Room Scan',
      simulator: 'What-If Simulator',
      consultant: 'AI Consultant',
    },
    personas: {
      commuter: 'Daily Commuter',
      family: 'Family with Kids',
      senior: 'Senior Citizen',
      student: 'Student / Sports',
      COMMUTER: 'Daily Commuter',
      FAMILY_KIDS: 'Family with Kids',
      SENIOR: 'Senior Citizen',
      STUDENT_ATHLETE: 'Student / Sports',
    },
    citySearchPlaceholder: 'Search any Indian city (e.g. Pune, Jaipur, Madurai)...',
    gpsButtonLabel: 'Use My GPS Location',
    gpsLocating: 'Locating...',
    personaSwitcherLabel: 'Household Profile',
    scaleToggleLabel: 'AQI Scale',
    evaluatorPresetLabel: 'Judge Scenarios',
    dashboard: {
      heroTitleSuffix: 'Air Quality Telemetry',
      aqiHeadingSuffix: 'Air Quality Index',
      dominantPollutant: 'Dominant Pollutant',
      dataProvider: 'Data Provider',
      provider: 'Data Provider',
      providerBlend: 'Copernicus CAMS & GFS via Open-Meteo',
      providerSub: 'Copernicus CAMS & GFS via Open-Meteo',
      refreshButton: 'Refresh Live',
      refreshing: 'Syncing...',
      freshnessFresh: 'Live & Fresh',
      freshnessStale: 'Stale (>60m)',
      freshnessUnavailable: 'Unavailable',
      safeWindowHeading: '24-Hour Safe Window Timeline',
      safeWindowSub: 'Sliding 2-hour rolling averages to guide natural ventilation and outdoor errands.',
      bestToVentilate: 'Best to Ventilate',
      bestOutdoor: 'Best Outdoor Window',
      peakSmog: 'Peak Smog Window',
      timelineHelper: 'Click or hover over any hour to inspect pollutant sub-indices.',
      plannerHeading: 'Personalized Daily Routine',
      plannerSub: 'Dynamic guidance tuned to active household profile and hourly particulate levels.',
      routineHeadingPrefix: 'Daily Routine Planner',
      tailoredGuidance: 'Tailored Guidance',
      pollutantHeading: 'Multi-Pollutant Breakdown',
      pollutantsHeading: 'Multi-Pollutant Breakdown',
      pollutantsSub: 'Concentrations & Indian CPCB sub-index scores.',
      trackedPollutants: '6 Tracked Pollutants',
      subIndexLabel: 'Sub-Index',
      saveAction: 'Save to Action Plan',
      actionSaved: 'Saved to Plan',
      staleWarningTitle: 'Notice: Displaying Stale Observation Data',
      staleWarningBody: 'The latest station telemetry is older than 60 minutes. Open-Meteo forecasts are displayed as fallback guidance.',
      unavailableWarningTitle: 'Live Telemetry Unavailable',
      unavailableWarningBody: 'Unable to connect to air monitoring stations. Showing safe fallback guidance.',
    },
    roomScan: {
      heading: 'Room & Smog Scan',
      sub: 'Upload a photo of your kitchen, bedroom, or outdoor haze for qualitative ventilation & exposure guidance.',
      dropTitle: 'Drop photo here or click to browse',
      dropHint: 'JPG, PNG, WEBP • Max 4 MB',
      selectedPrefix: 'Selected:',
      trySample: 'Try Sample Photo',
      analyzeCta: 'Analyze with Gemini Vision',
      analyzingCta: 'Analyzing photo with Gemini Vision...',
      resultsHeading: 'Visual Assessment',
      aiGuidance: 'AI Guidance',
      mechanismLabel: 'Mechanism:',
      fixLabel: 'Practical Fix:',
      checklistHeading: 'Quick Action Checklist',
      sensorDisclaimer:
        'Visual analysis is qualitative guidance; direct indoor monitoring requires a physical sensor',
    },
    simulator: {
      heading: "Today's Routine Swaps",
      sub: 'Toggle realistic daily adjustments to preview separate exposure and emissions effects.',
      dualHeading: 'Dual Impact Output — Strictly Separate',
      noBlendedScore: 'No Blended Score',
      cardALabel: 'Card A • Personal Exposure Shift',
      cardBLabel: 'Card B • Emissions Impact',
      exposureBadgeLower: 'Likely Lower Exposure Window',
      exposureBadgeNeutral: 'Baseline Exposure Routine',
      dosimetryDisclaimer: 'Estimate based on hourly outdoor trends, not personal dosimetry',
      co2SavedUnit: 'kg CO2e/day saved',
      showMath: 'Show Math & Assumptions',
      distanceLabel: 'Distance:',
      occupancyLabel: 'Occupancy:',
      savedLabel: 'Saved:',
    },
    consultant: {
      heading: 'Grounded AI Consultant',
      liveContextActive: 'Live Context Active',
      bestWindowPrefix: 'Best Window:',
      quickPrompts: [
        'What should I change today?',
        'How do I reduce cooking smoke?',
        'Why are you recommending this?',
        'Explain in Tamil',
      ],
      saveAction: 'Save Action',
      savedAction: 'Saved to Routine',
      savedPanelTitle: 'Saved Routine Actions',
      inputPlaceholder: "Ask about today's air quality, cooking smoke, or commute...",
      send: 'Send',
      sending: 'Thinking...',
      medicalDisclaimer: 'AIRQUA AI does not provide medical diagnoses',
    },
    footer: {
      outdoorNotIndoor: 'Outdoor AQI is not an indoor air measurement',
      simulateStale: 'Simulate Stale Data',
      disclaimer: 'AIRQUA AI provides educational and qualitative guidance based on open meteorological models and official CPCB breakpoints. Not a substitute for certified medical advice or calibrated indoor sensors.',
      simulateStaleLabel: 'Simulate Stale Data (Demo Mode)',
      builtWith: 'Built for PromptWars Challenge 6 with Next.js, Gemini API, and Open-Meteo.',
    },
  },
  ta: {
    guestMode: 'விருந்தினர் பயன்முறை',
    personaLabel: 'பயனர் வகை:',
    searchPlaceholder: 'இந்திய நகரங்களைத் தேடுங்கள்...',
    useGps: 'தற்போதைய GPS இடத்தைப் பயன்படுத்து',
    tryPreset: 'முயல்க: டெல்லி • குடும்பம்',
    appTitle: 'ஏர்குவா AI',
    tagline: 'காற்றை அறிவோம். விவேகமான முடிவுகளை எடுப்போம். தூய சமுதாயத்தை உருவாக்குவோம்.',
    nav: {
      dashboard: 'நேரடி காற்று & திட்டம்',
      roomScan: 'அறை & புகை ஸ்கேன்',
      simulator: 'தாக்க கணிப்பான்',
      assistant: 'AI ஆலோசகர்',
    },
    tabs: {
      dashboard: 'டாஷ்போர்டு',
      roomScan: 'அறை சோதனை',
      simulator: 'மாற்ற உருவகப்படுத்தி',
      consultant: 'AI ஆலோசகர்',
    },
    personas: {
      commuter: 'தினசரி பயணி',
      family: 'குழந்தைகளுடன் குடும்பம்',
      senior: 'மூத்த குடிமகன்',
      student: 'மாணவர் / விளையாட்டு',
      COMMUTER: 'தினசரி பயணி',
      FAMILY_KIDS: 'குழந்தைகள் உள்ள குடும்பம்',
      SENIOR: 'மூத்த குடிமக்கள்',
      STUDENT_ATHLETE: 'விளையாட்டு வீரர்',
    },
    citySearchPlaceholder: 'இந்திய நகரங்களைத் தேடுங்கள் (எ.கா: மதுரை, திருச்சி, கோவை)...',
    gpsButtonLabel: 'எனது ஜிபிஎஸ் இருப்பிடம்',
    gpsLocating: 'கண்டுபிடிக்கிறது...',
    personaSwitcherLabel: 'குடும்ப சுயவிவரம்',
    scaleToggleLabel: 'AQI அளவுமுறை',
    evaluatorPresetLabel: 'மாதிரி காட்சிகள்',
    dashboard: {
      heroTitleSuffix: 'நேரடி காற்றுத் தரம்',
      aqiHeadingSuffix: 'காற்றுத் தரக் குறியீடு',
      dominantPollutant: 'முக்கிய மாசுக் காரணி',
      dataProvider: 'தரவு வழங்குநர்',
      provider: 'தரவு வழங்குநர்',
      providerBlend: 'மணிநேர CPCB தொகுப்பு',
      providerSub: 'ஓபன்-மீட்டியோ வழியாக கோபர்நிகஸ் CAMS',
      refreshButton: 'புதுப்பி',
      refreshing: 'புதுப்பிக்கப்படுகிறது...',
      freshnessFresh: 'நேரடித் தரவு',
      freshnessStale: 'பழைய தரவு (>60 நிமி)',
      freshnessUnavailable: 'கிடைக்கவில்லை',
      safeWindowHeading: '24 மணி நேர பாதுகாப்பான சாளரம்',
      safeWindowSub: 'வீட்டு காற்றோட்டம் மற்றும் வெளிப்புற வேலைகளுக்கான 2 மணி நேர சுழல் சராசரி.',
      bestToVentilate: 'காற்றோட்டத்திற்கு உகந்தது',
      bestOutdoor: 'வெளிப்புற வேலைகளுக்கு உகந்தது',
      peakSmog: 'அதிகபட்ச புகை மூட்டம்',
      timelineHelper: 'ஒவ்வொரு மணிநேர மாசுக் குறியீட்டையும் பார்க்க ஏதேனும் ஒரு பட்டையைக் கிளிக் செய்யவும்.',
      plannerHeading: 'தனிப்பயனாக்கப்பட்ட தினசரி திட்டம்',
      plannerSub: 'உங்கள் குடும்பத்தின் சுயவிவரம் மற்றும் காற்றுத் தரத்திற்கு ஏற்ப வடிவமைக்கப்பட்ட வழிகாட்டல்.',
      routineHeadingPrefix: 'தினசரி செயல் திட்டம்',
      tailoredGuidance: 'தனிப்பயன் வழிகாட்டுதல்',
      pollutantHeading: 'பல-மாசுபடுத்தி விவரம்',
      pollutantsHeading: 'மாசுபொருட்களின் விவரம்',
      pollutantsSub: 'செறிவுகள் மற்றும் இந்திய CPCB துணை குறியீட்டு மதிப்புகள்.',
      trackedPollutants: '6 கண்காணிக்கப்பட்ட மாசுக்கள்',
      subIndexLabel: 'துணை குறியீடு',
      saveAction: 'செயல் திட்டத்தில் சேமி',
      actionSaved: 'சேமிக்கப்பட்டது',
      staleWarningTitle: 'எச்சரிக்கை: பழைய தரவு காட்டப்படுகிறது',
      staleWarningBody: 'கடைசி கண்காணிப்பு தரவு 60 நிமிடங்களுக்கும் மேலானது. மாதிரி முன்னறிவிப்புகள் காட்டப்படுகின்றன.',
      unavailableWarningTitle: 'நேரடித் தரவு கிடைக்கவில்லை',
      unavailableWarningBody: 'கண்காணிப்பு நிலையங்களுடன் இணைக்க முடியவில்லை. பாதுகாப்பான முன்னெச்சரிக்கை வழிகாட்டுதல் காட்டப்படுகிறது.',
    },
    roomScan: {
      heading: 'அறை & புகை பட சோதனை',
      sub: 'சமையலறை, படுக்கையறை அல்லது வெளிப்புறப் புகையின் புகைப்படத்தை பதிவேற்றி காற்றோட்ட ஆலோசனை பெறுங்கள்.',
      dropTitle: 'புகைப்படத்தை இங்கே இடவும் அல்லது தேர்வு செய்யவும்',
      dropHint: 'JPG, PNG, WEBP • அதிகபட்சம் 4 MB',
      selectedPrefix: 'தேர்ந்தெடுக்கப்பட்டது:',
      trySample: 'மாதிரிப் புகைப்படம்',
      analyzeCta: 'Gemini Vision மூலம் ஆய்வு செய்',
      analyzingCta: 'Gemini Vision ஆய்வு செய்கிறது...',
      resultsHeading: 'காட்சி மதிப்பீடு',
      aiGuidance: 'AI வழிகாட்டுதல்',
      mechanismLabel: 'காரணம்:',
      fixLabel: 'நடைமுறை தீர்வு:',
      checklistHeading: 'விரைவு செயல் பட்டியல்',
      sensorDisclaimer:
        'காட்சி ஆய்வு வழிகாட்டுதலுக்கு மட்டுமே; துல்லியமான உள்-காற்று அளவீட்டிற்கு சென்சார் தேவை',
    },
    simulator: {
      heading: 'இன்றைய பழக்க மாற்றங்கள்',
      sub: 'வெளிப்பாடு மற்றும் கார்பன் உமிழ்வு விளைவுகளைத் தனித்தனியாகக் காண தினசரி மாற்றங்களை இயக்கவும்.',
      dualHeading: 'இரட்டைத் தாக்க வெளியீடு — தனித்தனியாக',
      noBlendedScore: 'கலப்பு மதிப்பெண் இல்லை',
      cardALabel: 'அட்டை A • தனிநபர் மாசு வெளிப்பாடு மாற்றம்',
      cardBLabel: 'அட்டை B • கார்பன் உமிழ்வு தாக்கம்',
      exposureBadgeLower: 'குறைந்த வெளிப்பாடு வாய்ப்பு',
      exposureBadgeNeutral: 'அடிப்படை வெளிப்பாடு நிலை',
      dosimetryDisclaimer: 'மணிநேர வெளிப்புற போக்குகளின் அடிப்படையில் கணிப்பு; நேரடி அளவீடு அல்ல',
      co2SavedUnit: 'கி.கி CO2e/நாள் சேமிப்பு',
      showMath: 'கணக்கீடு & அனுமானங்களைக் காட்டு',
      distanceLabel: 'தூரம்:',
      occupancyLabel: 'பயணிகள்:',
      savedLabel: 'சேமிப்பு:',
    },
    consultant: {
      heading: 'தரவு-அடிப்படையிலான AI ஆலோசகர்',
      liveContextActive: 'நேரடித் தரவு இணைப்பு',
      bestWindowPrefix: 'சிறந்த நேரம்:',
      quickPrompts: [
        'இன்று நான் என்ன மாற்ற வேண்டும்?',
        'சமையல் புகையை எவ்வாறு குறைப்பது?',
        'இதை ஏன் பரிந்துரைக்கிறீர்கள்?',
        'தமிழில் விளக்கவும்',
      ],
      saveAction: 'செயலைச் சேமி',
      savedAction: 'திட்டத்தில் சேமிக்கப்பட்டது',
      savedPanelTitle: 'சேமித்த செயல் திட்டங்கள்',
      inputPlaceholder: 'இன்றைய காற்றுத் தரம், சமையல் புகை அல்லது பயணம் குறித்து கேளுங்கள்...',
      send: 'அனுப்பு',
      sending: 'சிந்திக்கிறது...',
      medicalDisclaimer: 'AIRQUA AI மருத்துவ நோயறிதலை வழங்காது',
    },
    footer: {
      outdoorNotIndoor: 'வெளிப்புற AQI என்பது வீட்டிற்குள் இருக்கும் காற்றின் அளவீடு அல்ல',
      simulateStale: 'பழைய தரவை உருவகப்படுத்து',
      disclaimer: 'ஏர்குவா AI ஆனது அதிகாரப்பூர்வ CPCB மற்றும் வானிலை மாதிரிகளின் அடிப்படையில் கல்வி வழிகாட்டலை மட்டுமே வழங்குகிறது. இது மருத்துவ ஆலோசனையோ அல்லது உட்புற சென்சார் அளவீடோ அல்ல.',
      simulateStaleLabel: 'பழைய தரவை மாதிரி செய்க (டெமோ)',
      builtWith: 'PromptWars Challenge 6 க்காக நெக்ஸ்ட்.ஜேஎஸ், ஜெமினி AI மற்றும் ஓபன்-மீட்டியோ மூலம் உருவாக்கப்பட்டது.',
    },
  },
};

export const TRANSLATIONS = DICTIONARY;

export function getDictionary(lang: SupportedLanguage) {
  return DICTIONARY[lang] || DICTIONARY.en;
}
