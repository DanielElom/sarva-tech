'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { MobileMenu } from './mobile-menu';
import { PRIMARY_CTA, PRIMARY_NAV } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * The navbar compacts once the page has scrolled past the first screenful of
 * chrome. This is not decoration: on a phone the header is the single largest
 * standing cost in vertical space, and giving some of it back the moment the
 * visitor commits to reading is the point.
 *
 * It is a CSS transition driven by one data attribute, not a JS animation —
 * cheap, and the reduced-motion block in globals.css collapses it to an instant
 * state change without this component needing to know.
 *
 * Contact is absent from these links on purpose (CLAUDE.md 9).
 */
export function Navbar() {
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setCompact(window.scrollY > 48);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-compact={compact ? '' : undefined}
      className={cn(
        'group sticky top-0 z-30 w-full',
        'border-b transition-[background-color,border-color,backdrop-filter] duration-200',
        compact
          ? 'border-line bg-surface-base/85 backdrop-blur-md'
          : 'border-transparent bg-surface-base',
      )}
    >
      <Container
        as="nav"
        className={cn(
          'flex items-center justify-between gap-4',
          'transition-[padding] duration-200',
          compact ? 'py-2.5' : 'py-4',
        )}
      >
        {/* aria-label on the nav landmark, since the header holds only this one */}
        <span className="sr-only" id="primary-navigation-label">
          Primary
        </span>
        <Logo size={compact ? 'sm' : 'md'} />

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
                    'inline-flex items-center rounded-sm px-3 py-2 text-sm',
                    'transition-colors duration-150',
                    // Inactive links sit at text-muted (6.46:1 day, 6.40:1
                    // night). CLAUDE.md 4.4 forbids dimming these further.
                    active ? 'text-accent-text' : 'text-muted hover:text-primary',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href={PRIMARY_CTA.href} size="sm" className="hidden md:inline-flex">
            {PRIMARY_CTA.label}
          </ButtonLink>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
