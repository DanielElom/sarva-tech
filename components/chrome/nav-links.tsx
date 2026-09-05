'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_NAV } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * The whole primary link list as ONE client component.
 *
 * It replaced a per-link client component, which meant five hydration
 * boundaries to compute one thing: which link is the current page. The pathname
 * is read once here and applied to all of them.
 *
 * Inactive links sit at `text-muted` — 6.46:1 in day, 6.40:1 in night.
 * CLAUDE.md 4.4 notes these run tight and forbids dimming them further.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="hidden items-center gap-1 md:flex">
      {PRIMARY_NAV.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-sm px-3 py-2 text-sm transition-colors duration-150',
                active ? 'text-accent-text' : 'text-muted hover:text-primary',
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
