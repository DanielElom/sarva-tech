'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

/**
 * Loaded on its own chunk, fetched only once this component decides to render
 * it — which is on idle, after first paint, and only on a viewport that should
 * have it at all. `ssr: false` keeps it out of the server render entirely.
 */
const HeroNodeGraphCanvas = dynamic(() => import('./hero-node-graph-canvas'), {
  ssr: false,
});

/** CLAUDE.md 5: static composition below 768px. */
const WIDE_ENOUGH = '(min-width: 768px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Decides whether the animated layer exists.
 *
 * The decision is deliberately a mount decision rather than a style one. Below
 * 768px, or with reduced motion asked for, there is no canvas in the document
 * and no requestAnimationFrame loop anywhere — not a hidden one. That is the
 * difference between honouring the constraint and appearing to.
 */
export function HeroNodeGraphAnimator() {
  const [active, setActive] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wide = window.matchMedia(WIDE_ENOUGH);
    const reduced = window.matchMedia(REDUCED_MOTION);

    // Not called synchronously here: the chunk should be fetched after the
    // browser has painted, not during hydration.
    const evaluate = () => setActive(wide.matches && !reduced.matches);

    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(evaluate, { timeout: 2000 })
        : window.setTimeout(evaluate, 400);

    wide.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(schedule as number);
      } else {
        window.clearTimeout(schedule);
      }
      wide.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  // Tell the panel to fade its static composition out from under the canvas.
  // An attribute rather than React state on the parent, so the server-rendered
  // SVG stays exactly as it was delivered.
  useEffect(() => {
    const panel = anchor.current?.closest('[data-hero-panel]');
    if (!panel) return;
    if (active) panel.setAttribute('data-animated', '');
    else panel.removeAttribute('data-animated');
    return () => panel.removeAttribute('data-animated');
  }, [active]);

  return (
    <div ref={anchor} aria-hidden="true" className="contents">
      {active ? <HeroNodeGraphCanvas /> : null}
    </div>
  );
}
