import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { Logo } from './logo';
import { NavLink } from './nav-link';
import { ThemeToggle } from './theme-toggle';
import { MobileMenu } from './mobile-menu';
import { HeaderScroll } from './header-scroll';
import { PRIMARY_CTA, PRIMARY_NAV } from '@/lib/site';

const HEADER_ID = 'site-header';

/**
 * A server component with three small client islands: the scroll watcher, the
 * per-link current-page state, and the two controls.
 *
 * The navbar compacts once the page has scrolled past the first screenful.
 * That is not decoration — on a phone the header is the largest standing cost
 * in vertical space, and giving some of it back the moment the visitor commits
 * to reading is the whole point. It is a CSS transition keyed off one
 * attribute, so it costs no JavaScript per frame.
 *
 * Contact is absent from these links on purpose (CLAUDE.md 9).
 */
export function Navbar() {
  return (
    <header id={HEADER_ID} className="site-header sticky top-0 z-30 w-full">
      <HeaderScroll targetId={HEADER_ID} />
      <Container as="nav" aria-label="Primary" className="site-header-bar">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((link) => (
            <li key={link.href}>
              <NavLink href={link.href} label={link.label} />
            </li>
          ))}
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
