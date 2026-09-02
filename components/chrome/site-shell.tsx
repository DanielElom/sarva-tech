import { type ReactNode } from 'react';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { SkipLink } from './skip-link';

/**
 * The chrome every route renders inside. Landmarks live here, once, so pages
 * only ever contribute their own <main> content and a single h1 (CLAUDE.md 7).
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
