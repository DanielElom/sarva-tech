import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';
import { StatusLine } from '@/components/ui/status-line';
import { PRIMARY_CTA, SITE } from '@/lib/site';

/**
 * S1 placeholder only.
 *
 * The real homepage is S2 (hero, what we do, problem-first) and S3 (services
 * ecosystem, process, technology, why Sarva Tech). CLAUDE.md 12 puts a copy
 * pass between S1 and S2 precisely so that layout follows copy — inventing
 * placeholder sections here would mean rebuilding them when the real words
 * arrive at a different length. So this route is deliberately thin.
 */
export default function HomePage() {
  return (
    <>
      <PageHeader eyebrow="Sys.Home" title={SITE.tagline}>
        <p className="measure mt-6 text-lead text-muted">
          {SITE.description} This is the S1 foundation: design system, shell, routes and a
          live health readout. The homepage itself is built in S2 and S3.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</ButtonLink>
          <ButtonLink href="/services" variant="secondary">
            See How We Work
          </ButtonLink>
        </div>
        <div className="mt-10">
          <StatusLine />
        </div>
      </PageHeader>

      {/*
        Demonstrates surface-inverted: this band flips against whichever theme
        is active, so the contrast rhythm holds in both (CLAUDE.md 4.1).
      */}
      <Container as="section" data-surface="inverted" className="max-w-none bg-surface-base">
        <Container className="py-section">
          <Readout className="text-muted">Surface.Inverted</Readout>
          <h2 className="mt-4 text-h2">This band flips with the theme.</h2>
          <p className="measure mt-4 text-lead text-muted">
            Toggle the theme and this section swaps with it, staying the opposite of the
            page around it. Its text, muted text, borders and accent all resolve from the
            inverted token set, so nothing here needs a per-theme override.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</ButtonLink>
            <ButtonLink href="/work" variant="secondary">
              Explore What We Build
            </ButtonLink>
          </div>
        </Container>
      </Container>

      <Container as="section" className="py-section">
        <div className="elevated rounded-lg p-6 sm:p-8">
          <Readout className="text-muted">Sys.Arch_V.01</Readout>
          <h2 className="mt-4 text-h3">Foundation in place</h2>
          <p className="measure mt-4 text-muted">
            Tokens, themes, type scale, motion primitives, navigation, footer, route
            skeleton and the health endpoint. Homepage sections land in S2.
          </p>
        </div>
      </Container>
    </>
  );
}
