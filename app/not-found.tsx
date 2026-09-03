import type { Metadata } from 'next';
import { SiteShell } from '@/components/chrome/site-shell';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';
import { PRIMARY_NAV } from '@/lib/site';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * CLAUDE.md 13 — designed, not a framework default. It renders in the full
 * shell, uses the readout language for the status code (a status code IS
 * instrumentation), and gives the visitor somewhere to go rather than
 * apologising (CLAUDE.md 10: errors do not apologise and are never vague).
 */
export default function NotFound() {
  return (
    <SiteShell>
      <Container as="section" className="py-section">
        <Readout tone="accent">HTTP 404 · Route Not Found</Readout>
        <h1 className="text-h1 leading-display tracking-display mt-4">
          There is nothing at this address.
        </h1>
        <p className="measure text-lead text-muted mt-6">
          The link may be old, or the page may not exist yet. Everything that does exist is
          one of these:
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {PRIMARY_NAV.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-accent-text rounded-xs underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <ButtonLink href="/">Back to Home</ButtonLink>
        </div>
      </Container>
    </SiteShell>
  );
}
