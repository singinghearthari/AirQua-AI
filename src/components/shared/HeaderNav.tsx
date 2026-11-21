'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  CheckSquare,
  ChevronDown,
  Cloud,
  Gauge,
  LayoutDashboard,
  Loader2,
  LocateFixed,
  MessageSquare,
  Search,
  Sparkles,
  User,
  Wind,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { FEATURED_CITIES, PERSONA_LABELS } from '@/lib/constants';
import { CityPreset, HouseholdPersona } from '@/types/airqua';
import DemoToolsPopover from './DemoToolsPopover';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityPreset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Debounced geocoding search for queries of 2+ chars
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setIsSearchOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('Geocoding search failed:', e);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const navItems = [
    {
      href: '/',
      label: t.nav.dashboard,
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: '/room-scan',
      label: t.nav.roomScan,
      icon: <Camera className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: '/simulator',
      label: t.nav.simulator,
      icon: <Gauge className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: '/assistant',
      label: t.nav.assistant,
      icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const personas: HouseholdPersona[] = [
    'FAMILY_KIDS',
    'COMMUTER',
    'SENIOR',
    'STUDENT_ATHLETE',
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
        {/* Top Bar: Brand, Centered Auth (Login / Signup), Presets, Scale & Language */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="AIRQUA AI Home"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 shrink-0"
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden border border-outline-variant/60 shadow-xs flex items-center justify-center shrink-0 bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpeg"
                alt="AIRQUA AI Logo"
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

          {/* CENTER: Prominent Login / Sign Up Controls */}
          <div className="flex items-center justify-center my-0.5 order-last md:order-none">
            {!user ? (
              <div
                role="region"
                aria-label="Account Access"
                className="inline-flex items-center gap-1.5 p-1 rounded-full border border-primary/30 bg-primary-container/20 shadow-xs backdrop-blur-xs"
              >
                <div className="hidden lg:flex items-center gap-1.5 pl-3 pr-1 text-[12px] font-medium text-on-surface-variant">
                  <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Guest Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  aria-label="Log in to your account"
                  className="rounded-full px-4 py-1.5 text-[12px] font-bold text-on-surface hover:text-primary hover:bg-surface-container transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  aria-label="Sign up for a free account to sync preferences and routines"
                  className="rounded-full bg-primary hover:bg-primary/90 text-on-primary px-4 py-1.5 text-[12px] font-bold shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                >
                  Sign Up Free
                </button>
              </div>
            ) : (
              <div
                role="region"
                aria-label="Signed-in Account Status"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary-container/30 shadow-xs backdrop-blur-xs text-[12px]"
              >
                <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className="max-w-[130px] truncate font-bold text-primary"
                    title={user.displayName || user.email || 'User'}
                  >
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    <Cloud className="h-3 w-3" aria-hidden="true" />
                    Cloud Synced
                  </span>
                </div>
                <span className="h-3 w-px bg-outline-variant/80" />
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  aria-label="Sign out of account"
                  className="text-[11px] font-bold text-on-surface-variant hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Today's Saved Routine Drawer Trigger */}
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

            {/* Subtle Collapsible Demo Tools Popover (Evaluator Presets + Stale Toggle) */}
            <DemoToolsPopover />

            {/* Strict AQI Scale Switcher */}
            <div
              role="group"
              aria-label={t.scaleToggleLabel}
              className="inline-flex rounded-md border border-outline-variant bg-surface-container-low p-0.5 text-[12px] font-semibold"
            >
              <button
                type="button"
                onClick={() => setScale('IN_CPCB')}
                aria-pressed={scale === 'IN_CPCB'}
                className={`rounded px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  scale === 'IN_CPCB'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                CPCB (India)
              </button>
              <button
                type="button"
                onClick={() => setScale('US_EPA')}
                aria-pressed={scale === 'US_EPA'}
                className={`rounded px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  scale === 'US_EPA'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                US EPA
              </button>
            </div>

            {/* Language Switcher */}
            <div
              role="group"
              aria-label="Language selection"
              className="inline-flex rounded-md border border-outline-variant bg-surface-container-low p-0.5 text-[12px] font-semibold font-mono"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={`rounded px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  language === 'en'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                aria-pressed={language === 'ta'}
                className={`rounded px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  language === 'ta'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        {/* Mid Row: City Pills & Search Autocomplete + Geolocation */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick-Select City Pills */}
          <div
            role="group"
            aria-label="Popular Indian Cities"
            className="flex flex-wrap items-center gap-1.5"
          >
            {FEATURED_CITIES.map((c) => {
              const isSelected =
                city.name.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCity(c)}
                  aria-pressed={isSelected}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isSelected
                      ? 'bg-on-surface text-surface border-on-surface font-semibold shadow-xs'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Search Input & GPS */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-md" ref={searchContainerRef}>
            <div className="relative flex-1">
              <label htmlFor="city-search-input" className="sr-only">
                {t.citySearchPlaceholder}
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant"
                  aria-hidden="true"
                />
                <input
                  id="city-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsSearchOpen(true);
                  }}
                  placeholder={t.citySearchPlaceholder}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest pl-9 pr-8 py-1.5 text-[12px] text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
                {isSearching && (
                  <Loader2
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 mt-1 rounded-md border border-outline-variant bg-surface-container-lowest p-1 shadow-lg z-50 max-h-56 overflow-y-auto"
                >
                  {searchResults.map((result, idx) => (
                    <li
                      key={`${result.name}-${result.latitude}-${idx}`}
                      role="option"
                      aria-selected={false}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCity(result);
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded text-[12px] hover:bg-surface-container text-on-surface flex items-center justify-between transition-colors focus-visible:bg-surface-container focus-visible:outline-none"
                      >
                        <span className="font-semibold">{result.name}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {result.region || result.countryCode}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* GPS Button */}
            <button
              type="button"
              onClick={useGpsLocation}
              disabled={isGpsLoading}
              aria-label={t.gpsButtonLabel}
              title={t.gpsButtonLabel}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 shrink-0"
            >
              {isGpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Row: 4 Household Personas & App Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/60">
          {/* Persona Switcher */}
          <div
            role="radiogroup"
            aria-label={t.personaSwitcherLabel}
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-[11px] font-semibold text-on-surface-variant mr-1">
              {t.personaSwitcherLabel}:
            </span>
            {personas.map((p) => {
              const isSelected = persona === p;
              const meta = PERSONA_LABELS[p];
              const label = language === 'ta' ? meta.ta : meta.en;

              return (
                <button
                  key={p}
                  role="radio"
                  type="button"
                  onClick={() => setPersona(p)}
                  aria-checked={isSelected}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-all border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-xs'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Primary Nav Links */}
          <nav aria-label="Main application sections">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isActive
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Optional GPS Error alert banner */}
        {gpsError && (
          <div
            role="alert"
            className="rounded-md bg-error-container text-on-error-container px-3 py-1.5 text-[12px]"
          >
            {gpsError}
          </div>
        )}
      </div>
    </header>
  );
}
