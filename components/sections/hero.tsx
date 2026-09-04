import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { StatusLine } from '@/components/ui/status-line';
import { PRIMARY_CTA } from '@/lib/site';
import { HeroNodeGraph } from './hero-node-graph';

/**
 * The homepage hero. CLAUDE.md 5: the memorable moment of the page is here, and
 * everything after it stays quiet.
 *
 * The copy comes first in the DOM on every viewport — the argument is the text,
 * and the panel is the evidence beside it.
 */
export function Hero() {
  return (
    <Container as="section" className="py-section">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          {/*
            Not the readout treatment. CLAUDE.md 4.6 reserves monospace AND
            tracked caps for the systems-readout layer — hero panel chrome, the
            status line, technology labels, case-study metrics. This is a
            marketing kicker, not instrumentation, and putting it in the
            instrument voice is exactly how that language degrades into generic
            template chrome. It reads as an eyebrow through size, weight and
            colour instead.
          */}
          <p className="font-display text-sm font-medium text-accent-text">
            Technology solutions for the real world
          </p>

          <h1 className="mt-5 text-display leading-display tracking-display">
            We Build Technology That Solves Real Problems.
          </h1>

          <p className="measure mt-6 text-lead text-muted">
            From ideas to intelligent digital products, Sarva Tech helps businesses and
            organizations turn complex problems into practical technology solutions.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</ButtonLink>
            <ButtonLink href="/solutions" variant="secondary">
              Explore What We Build
            </ButtonLink>
          </div>

          <div className="mt-9">
            <StatusLine />
          </div>
        </div>

        <HeroNodeGraph />
      </div>
    </Container>
  );
}
