'use client';

import { useSyncExternalStore } from 'react';

/**
 * CLAUDE.md 5: `prefers-reduced-motion: reduce` disables all non-essential
 * motion, and every flow must be completable with motion off.
 *
 * The preference is external state owned by the browser, so it is read through
 * useSyncExternalStore rather than mirrored into React state by an effect.
 * That matters here: it means the very first client render already knows the
 * answer, so a visitor who asked for reduced motion never sees a frame of
 * animation before the preference is applied.
 *
 * The server snapshot is `true` — the safe render is the one without motion.
 *
 * This wraps matchMedia directly rather than motion's own hook so that nothing
 * on the reduced-motion path has to load `motion/react` at all.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useMotionPreference(): { reduced: boolean } {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { reduced };
}
