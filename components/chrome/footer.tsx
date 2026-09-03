import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';
import { StatusLine } from '@/components/ui/status-line';
import { Logo } from './logo';
import { CONTACT, FOOTER_COLUMNS, LEGAL_LINKS, PRIMARY_CTA, SITE } from '@/lib/site';

/**
 * Two parts.
 *
 * The conversion footer carries the last ask on every page, and the column
 * block. It sits on an inverted surface, so it reads as a distinct band in both
 * themes rather than only in one (CLAUDE.md 4.1).
 *
 * The legal strip below is thin and quiet.
 *
 * CLAUDE.md 11: WhatsApp only. There are no social accounts, so there are no
 * social icons. There is no address, so none is invented. The copyright year is
 * evaluated when this server component renders at build time, never typed.
 *
 * Every link here is `prefetch={false}`. Next prefetches visible links on idle,
 * and a footer of twenty links means twenty speculative requests competing with
 * hydration on a mid-range phone (CLAUDE.md 6) to serve a click that mostly
 * does not come. The primary nav and the CTA still prefetch — that is where
 * intent actually is.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto">
      {/* Conversion footer, on an inverted surface. */}
      <div data-surface="inverted" className="bg-surface-base text-primary">
        <Container className="py-section">
          <div className="border-line flex flex-col gap-8 border-b pb-12 md:flex-row md:items-end md:justify-between">
            <div className="measure">
              <h2 className="text-h2">Have a problem worth solving?</h2>
              <p className="text-lead text-muted mt-4">
                Tell us what is not working. We will tell you what we would build, what it
                would take, and whether we are the right people for it.
              </p>
            </div>
            <ButtonLink href={PRIMARY_CTA.href} className="shrink-0">
              {PRIMARY_CTA.label}
            </ButtonLink>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-12 md:grid-cols-5">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <Readout className="text-muted">{column.heading}</Readout>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="text-muted hover:text-accent-text rounded-xs text-sm transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <Readout className="text-muted">Contact</Readout>
              <ul className="mt-4 flex flex-col gap-2.5">
                <li>
                  <a
                    href={CONTACT.whatsappUrl}
                    className="text-muted hover:text-accent-text rounded-xs text-sm transition-colors duration-150"
                  >
                    WhatsApp {CONTACT.whatsappNumber}
                  </a>
                </li>
                <li>
                  <Link
                    href="/contact"
                    prefetch={false}
                    className="text-muted hover:text-accent-text rounded-xs text-sm transition-colors duration-150"
                  >
                    Send a message
                  </Link>
                </li>
                <li className="text-muted text-sm">
                  Email address goes live with the domain.
                </li>
              </ul>
            </div>
          </div>

          {/* The readout is live, not a decoration. See CLAUDE.md 8. */}
          <div className="border-line mt-12 border-t pt-6">
            <StatusLine />
          </div>
        </Container>
      </div>

      {/* Legal strip. */}
      <div className="border-line bg-surface-base border-t">
        <Container className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" asLink={false} />
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="text-muted hover:text-accent-text rounded-xs text-sm transition-colors duration-150"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-muted text-sm">
            &copy; {year} {SITE.name}
          </p>
        </Container>
      </div>
    </footer>
  );
}
