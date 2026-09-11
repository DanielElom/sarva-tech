import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { SolutionEntries } from '@/components/sections/solution-entries';
import { getSolutions } from '@/lib/solutions';
import { PRIMARY_CTA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'Sarva Tech builds its own products, not only client work. Sarva Logistics and Lumen Market — what each one solves, what it does, and what it is built with.',
  alternates: { canonical: '/solutions' },
};

/**
 * Surface rhythm: N N I. One inverted band, the closing CTA, which is far
 * enough from the footer's own band not to abut it. The entries themselves are
 * a set and inverting one would imply a rank they do not have.
 */
export default function SolutionsPage() {
  const solutions = getSolutions();

  return (
    <>
      <PageHeader
        eyebrow="Sys.Solutions"
        title="What we build."
        intro="Sarva Tech builds its own products, not only client work. These are ours."
      />

      <SolutionEntries solutions={solutions} />

      <section data-surface="inverted" aria-labelledby="solutions-cta-heading">
        <Container className="py-section">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="measure">
              <h2 id="solutions-cta-heading" className="text-h3">
                Building something of your own?
              </h2>
              <p className="text-muted mt-3">
                These started the same way yours would: a problem someone could describe
                clearly, and no product that solved it.
              </p>
            </div>
            <ButtonLink href={PRIMARY_CTA.href} className="shrink-0">
              {PRIMARY_CTA.label}
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
