'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  CheckSquare,
  Gauge,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import DemoToolsPopover from './DemoToolsPopover';
import HeaderAccountControls from './HeaderAccountControls';
import CitySearchBar from './CitySearchBar';
import PersonaAndNavBar, { NavItemConfig } from './PersonaAndNavBar';

export default function HeaderNav() {
  const pathname = usePathname();
  const {
    city,
    setCity,
    persona,
    setPersona,
    scale,
    setScale,
    language,
    setLanguage,
    useGpsLocation,
    isGpsLoading,
    gpsError,
    savedActions,
    setIsRoutineDrawerOpen,
    openAuthModal,
    t,
  } = useAirqua();
  const { user, signOutUser } = useAuth();

  const navItems: NavItemConfig[] = [
    { href: '/', label: t.nav.dashboard, icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> },
    { href: '/room-scan', label: t.nav.roomScan, icon: <Camera className="h-4 w-4" aria-hidden="true" /> },
    { href: '/simulator', label: t.nav.simulator, icon: <Gauge className="h-4 w-4" aria-hidden="true" /> },
    { href: '/assistant', label: t.nav.assistant, icon: <MessageSquare className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="AIRQUA AI Home"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 shrink-0"
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden border border-outline-variant/60 shadow-xs flex items-center justify-center shrink-0 bg-surface-container">
              <Image
                src="/logo.jpeg"
                alt="AIRQUA AI Logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="font-display font-bold text-[18px] text-on-surface tracking-tight">
                AIRQUA <span className="text-primary">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant">
                PromptWars Challenge 6
              </span>
            </div>
          </Link>

          <div className="flex items-center justify-center my-0.5 order-last md:order-none">
            <HeaderAccountControls
              user={user}
              onOpenAuthModal={openAuthModal}
              onSignOut={signOutUser}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsRoutineDrawerOpen(true)}
              aria-label={`Open today's saved routine plan with ${savedActions.length} actions`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-[12px] font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer shadow-2xs"
            >
              <CheckSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>My Plan</span>
              {savedActions.length > 0 && (
                <span className="rounded-full bg-primary text-on-primary px-1.5 py-0.2 text-[10px] font-bold">
                  {savedActions.length}
                </span>
              )}
            </button>

            <DemoToolsPopover />

            <div
              role="group"
              aria-label={t.scaleToggleLabel}
              className="inline-flex rounded-md border border-outline-variant bg-surface-container-low p-0.5 text-[12px] font-semibold"
            >
              {(['IN_CPCB', 'US_EPA'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  aria-pressed={scale === s}
                  className={`rounded px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    scale === s
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {s === 'IN_CPCB' ? 'CPCB (India)' : 'US EPA'}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Language selection"
              className="inline-flex rounded-md border border-outline-variant bg-surface-container-low p-0.5 text-[12px] font-semibold font-mono"
            >
              {(['en', 'ta'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  aria-pressed={language === lang}
                  className={`rounded px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    language === lang
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {lang === 'en' ? 'EN' : 'தமிழ்'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CitySearchBar
          city={city}
          onSelectCity={setCity}
          onUseGps={useGpsLocation}
          isGpsLoading={isGpsLoading}
          searchPlaceholder={t.citySearchPlaceholder || t.searchPlaceholder}
          gpsLabel={t.gpsButtonLabel || t.useGps}
        />

        <PersonaAndNavBar
          persona={persona}
          onSelectPersona={setPersona}
          language={language}
          personaSwitcherLabel={t.personaSwitcherLabel || t.personaLabel}
          navItems={navItems}
          pathname={pathname}
        />

        {gpsError && (
          <div role="alert" className="rounded-md bg-error-container text-on-error-container px-3 py-1.5 text-[12px]">
            {gpsError}
          </div>
        )}
      </div>
    </header>
  );
}
