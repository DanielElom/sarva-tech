'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * A primary navigation link that knows whether it is the current page.
 *
 * This is the only part of the navbar that needs the client, so it is the only
 * part that runs there.
 *
 * Inactive links sit at `text-muted` — 6.46:1 in day, 6.40:1 in night.
 * CLAUDE.md 4.4 notes these run tight in the original design and forbids
 * dimming them any further.
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center rounded-sm px-3 py-2 text-sm transition-colors duration-150',
        active ? 'text-accent-text' : 'text-muted hover:text-primary',
      )}
    >
      {label}
    </Link>
  );
}
