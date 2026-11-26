'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, Search } from 'lucide-react';
import { FEATURED_CITIES } from '@/lib/constants';
import { CityPreset } from '@/types/airqua';

interface CitySearchBarProps {
  city: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  onUseGps: () => void;
  isGpsLoading: boolean;
  searchPlaceholder: string;
  gpsLabel: string;
}

export default function CitySearchBar({
  city,
  onSelectCity,
  onUseGps,
  isGpsLoading,
  searchPlaceholder,
  gpsLabel,
}: CitySearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityPreset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
          const data = (await res.json()) as { results?: CityPreset[] };
          setSearchResults(data.results || []);
          setActiveIndex(-1);
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

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setActiveIndex(-1);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      setIsSearching(false);
    }
  };

  const selectSuggestion = (suggestion: CityPreset) => {
    onSelectCity(suggestion);
    setSearchQuery('');
    setIsSearchOpen(false);
    setActiveIndex(-1);
  };

  const handleComboKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isSearchOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && searchResults[activeIndex]) {
      e.preventDefault();
      selectSuggestion(searchResults[activeIndex]);
    }
  };

  const listboxVisible = isSearchOpen && searchResults.length > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <div
        role="group"
        aria-label="Popular Indian Cities"
        className="flex flex-wrap items-center gap-1.5"
      >
        {FEATURED_CITIES.map((c) => {
          const isSelected = city.name.toLowerCase() === c.name.toLowerCase();
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelectCity(c)}
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

      <div className="flex items-center gap-2 flex-1 sm:max-w-md" ref={searchContainerRef}>
        <div className="relative flex-1">
          <label htmlFor="city-search-input" className="sr-only">
            {searchPlaceholder}
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              id="city-search-input"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listboxVisible}
              aria-controls="city-search-listbox"
              aria-activedescendant={
                listboxVisible && activeIndex >= 0 ? `city-option-${activeIndex}` : undefined
              }
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleComboKeyDown}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchOpen(true);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest pl-9 pr-8 py-1.5 text-[12px] text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            {isSearching && (
              <Loader2
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary"
                aria-hidden="true"
              />
            )}
          </div>

          {listboxVisible && (
            <ul
              id="city-search-listbox"
              role="listbox"
              aria-label="City search suggestions"
              className="absolute left-0 right-0 mt-1 rounded-md border border-outline-variant bg-surface-container-lowest p-1 shadow-lg z-50 max-h-56 overflow-y-auto"
            >
              {searchResults.map((result, idx) => {
                const isOptionActive = activeIndex === idx;
                return (
                  <li
                    key={`${result.name}-${result.latitude}-${idx}`}
                    id={`city-option-${idx}`}
                    role="option"
                    aria-selected={isOptionActive}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => selectSuggestion(result)}
                      className={`w-full text-left px-3 py-1.5 rounded text-[12px] text-on-surface flex items-center justify-between transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isOptionActive ? 'bg-surface-container font-semibold' : 'hover:bg-surface-container'
                      }`}
                    >
                      <span className="font-semibold">{result.name}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        {result.region || result.countryCode}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onUseGps}
          disabled={isGpsLoading}
          aria-label={gpsLabel}
          title={gpsLabel}
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
  );
}
