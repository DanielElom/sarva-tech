'use client';

import { useEffect } from 'react';

/**
 * Toggles `data-compact` on the header once the page has scrolled.
 *
 * Renders nothing. It exists so the header itself can stay a server component:
 * making the whole navbar a client component to watch one scroll position
 * meant hydrating the logo, every link and the CTA for no reason.
 *
 * The compaction is expressed in CSS against the attribute, so this does no
 * layout work of its own and `prefers-reduced-motion` neutralises it through
 * the global rule.
 */
export function HeaderScroll({ targetId }: { targetId: string }) {
  useEffect(() => {
    const header = document.getElementById(targetId);
    if (!header) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const compact = window.scrollY > 48;
      if (compact === header.hasAttribute('data-compact')) return;
      header.toggleAttribute('data-compact', compact);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return null;
}
