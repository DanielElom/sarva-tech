'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  isTheme,
  oppositeTheme,
  type Theme,
} from '@/lib/tokens';

/**
 * Theme state, with no provider and no context.
 *
 * The `<html data-theme>` attribute is the single source of truth. The
 * pre-paint script writes it before React exists (which is what prevents the
 * flash), so React reads it rather than owning it — and once it is read through
 * useSyncExternalStore, a context is redundant. That matters beyond tidiness:
 * a provider would put a client boundary around the entire body of every page,
 * and the only things that need the theme are two toggle buttons.
 *
 * Every consumer subscribes to the same attribute, so they stay in agreement
 * without anything having to broadcast.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  const attribute = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isTheme(attribute) ? attribute : DEFAULT_THEME;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

const subscribeToHydration = () => () => {};

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const setTheme = useCallback((value: Theme) => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Private mode or blocked storage. The choice still applies to this page
      // view, it just will not persist. Not worth interrupting anyone over.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(oppositeTheme(getSnapshot()));
  }, [setTheme]);

  /**
   * Keep following the system preference until the visitor makes a manual
   * choice; once something is stored, that choice wins. This only ever touches
   * the DOM, never React state, so the attribute stays the one record of truth.
   */
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return;
      document.documentElement.setAttribute(
        THEME_ATTRIBUTE,
        event.matches ? 'night' : 'day',
      );
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return { theme, next: oppositeTheme(theme), setTheme, toggle, ready };
}
