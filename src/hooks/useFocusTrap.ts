'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  isOpen: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => getComputedStyle(el).visibility !== 'hidden'
  );
}

/**
 * Traps keyboard Tab navigation inside an open modal/drawer, handles Escape dismissal,
 * focuses an initial element on open, and restores focus to the trigger element on close.
 */
export function useFocusTrap({
  isOpen,
  containerRef,
  onClose,
  initialFocusRef,
}: UseFocusTrapOptions): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousActive =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      if (container) {
        const focusables = getFocusableElements(container);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          container.focus();
        }
      }
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [isOpen, containerRef, initialFocusRef]);
}
