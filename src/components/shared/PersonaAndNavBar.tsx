'use client';

import React from 'react';
import Link from 'next/link';
import { PERSONA_LABELS } from '@/lib/constants';
import { HouseholdPersona, SupportedLanguage } from '@/types/airqua';

const PERSONAS: HouseholdPersona[] = [
  'FAMILY_KIDS',
  'COMMUTER',
  'SENIOR',
  'STUDENT_ATHLETE',
];

export interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface PersonaAndNavBarProps {
  persona: HouseholdPersona;
  onSelectPersona: (persona: HouseholdPersona) => void;
  language: SupportedLanguage;
  personaSwitcherLabel: string;
  navItems: NavItemConfig[];
  pathname: string;
}

export default function PersonaAndNavBar({
  persona,
  onSelectPersona,
  language,
  personaSwitcherLabel,
  navItems,
  pathname,
}: PersonaAndNavBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/60">
      <div
        role="radiogroup"
        aria-label={personaSwitcherLabel}
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="text-[11px] font-semibold text-on-surface-variant mr-1">
          {personaSwitcherLabel}:
        </span>
        {PERSONAS.map((p) => {
          const isSelected = persona === p;
          const meta = PERSONA_LABELS[p];
          const label = language === 'ta' ? meta.ta : meta.en;

          return (
            <button
              key={p}
              role="radio"
              type="button"
              onClick={() => onSelectPersona(p)}
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
  );
}
