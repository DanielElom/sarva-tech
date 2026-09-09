import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ServicesEcosystem } from '@/components/sections/services-ecosystem';
import { ServiceDetail } from '@/components/sections/service-detail';
import { PRIMARY_CTA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Product development, technology strategy, rescue and optimization, digital infrastructure, and technology talent — what each one solves, what we deliver, and what you end up with.',
  alternates: { canonical: '/services' },
};

/**
 * Surface rhythm: N I N N I.
 *
 * The ecosystem map takes the inversion. It is the one instrument-like element
 * on the page and it reads as a panel, so the dark ground suits it, and placing
 * it high gives a long reading page an anchor early. Nothing else is inverted:
 * the five categories are a set, and inverting one of them would imply a rank
 * they do not have. That leaves the map and the footer as the two inverted
 * bands, far apart, with no two adjacent.
 *
 * The page's conversion block is deliberately NOT inverted, which is also how
 * it avoids reading as the footer's conversion block twice: different question,
 * and a bordered panel on the page surface rather than a full-bleed inverted
 * band.
 */
export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Services"
        title="What we do, in detail."
        intro="Five things, though most projects touch more than one. If you are not sure which you need, that is what the first conversation is for."
      />

      <ServicesEcosystem />
      <ServiceDetail />

      <Container as="section" className="pb-section">
        <div className="elevated flex flex-col gap-6 rounded-lg p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="measure">
            <h2 className="text-h3">Not sure which of these you need?</h2>
            <p className="text-muted mt-3">
              Most people are not, at the start. Describe the problem and we will tell you
              which of these it is — or that it is none of them.
            </p>
          </div>
          <ButtonLink href={PRIMARY_CTA.href} className="shrink-0">
            {PRIMARY_CTA.label}
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
