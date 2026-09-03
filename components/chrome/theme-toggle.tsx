'use client';

import { useTheme } from './use-theme';
import { cn } from '@/lib/cn';

/**
 * CLAUDE.md 4.1 / 7.
 *
 * The accessible name says what pressing it will DO, not what the current state
 * is — "Switch to day theme" — because that is the only phrasing that is
 * unambiguous when read out of context.
 *
 * The icon is inline SVG using `currentColor`, so it inherits `accent-text` and
 * never needs a colour of its own. Before hydration the button renders the icon
 * for the SSR default and is marked busy; `ready` flips it to the real value on
 * mount, so no wrong label is ever announced as settled.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, next, toggle, ready } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      aria-busy={!ready}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-sm',
        'border-line text-accent-text border',
        'hover:bg-surface-frame transition-colors duration-150',
        className,
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
        strokeLinejoin="round"
      >
        {theme === 'night' ? (
          // Currently night: offer the sun.
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          // Currently day: offer the moon.
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
