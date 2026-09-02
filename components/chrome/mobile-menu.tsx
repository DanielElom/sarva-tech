'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { PRIMARY_CTA, PRIMARY_NAV, CONTACT } from '@/lib/site';
import { cn } from '@/lib/cn';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen navigation for small viewports.
 *
 * The behaviour required of a modal dialog, all of it, and none of it delegated
 * to the animation layer so that it works identically with reduced motion:
 *
 *  - focus moves into the panel on open and is trapped there while it is open;
 *  - Escape closes;
 *  - the page behind cannot scroll;
 *  - focus returns to the trigger on close.
 *
 * The slide itself is a CSS transform transition rather than one of the
 * components/motion primitives. This component sits in the header of every
 * route, and chrome does not get to put an animation library in the shared
 * bundle of a site whose visitors are on mid-range Android over mobile data
 * (CLAUDE.md 6). `prefers-reduced-motion` collapses the transition through the
 * global rule, and none of the behaviour above depends on it.
 *
 * The panel stays mounted and is marked `inert` when closed, which takes it out
 * of the tab order and the accessibility tree without a mount transition.
 */
export function MobileMenu() {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const panelId = useId();

  /**
   * The menu records the route it was opened on rather than a bare boolean, so
   * navigating closes it as a consequence of the route changing — no effect
   * watching the pathname, and no window in which the panel outlives the page
   * it belongs to while still trapping focus.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const close = useCallback(() => setOpenedOn(null), []);

  // Escape closes, and Tab is confined to the panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  // Lock the page behind the panel. Padding compensates for the scrollbar so
  // the layout underneath does not jump on open.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Focus in on open, back to the trigger on close.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      // Wait a frame so the panel exists even when it is being animated in.
      const id = requestAnimationFrame(() => {
        const panel = panelRef.current;
        panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenedOn((value) => (value === pathname ? null : pathname))}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-sm md:hidden',
          'border border-line text-accent-text transition-colors duration-150',
          'hover:bg-surface-frame',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
        </svg>
      </button>

      <div
        aria-hidden="true"
        onClick={close}
        data-state={open ? 'open' : 'closed'}
        className="scrim fixed inset-0 z-40 bg-surface-inverted/40 md:hidden"
      />

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        inert={!open}
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col md:hidden',
          'border-l border-line bg-surface-raised shadow-elevated',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-gutter py-4">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-sm',
                'border border-line text-accent-text transition-colors duration-150',
                'hover:bg-surface-frame',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className="size-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-gutter py-6">
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded-sm py-3 font-display text-h4 tracking-heading',
                      'transition-colors duration-150',
                      active ? 'text-accent-text' : 'text-primary hover:text-accent-text',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line px-gutter py-6">
          <ButtonLink href={PRIMARY_CTA.href} className="w-full">
            {PRIMARY_CTA.label}
          </ButtonLink>
          <a
            href={CONTACT.whatsappUrl}
            className="mt-4 inline-flex rounded-xs text-sm text-muted underline-offset-4 hover:text-accent-text hover:underline"
          >
            WhatsApp {CONTACT.whatsappNumber}
          </a>
          <Readout className="mt-4 block text-muted">Sarva Tech</Readout>
        </div>
      </div>
    </>
  );
}
