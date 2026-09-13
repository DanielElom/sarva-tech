import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { getSolutions } from '@/lib/solutions';
import { PRIMARY_CTA } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  route: '/about',
  title: 'About',
  description:
    'Sarva Tech exists to make technology practical. Why the company builds its own products, why the goal is removing friction rather than adding software, and what it intends to become.',
});

/**
 * The philosophy page, not a company history.
 *
 * There is no team section, no founding date and no office, because none of
 * those are things Sarva Tech can currently state truthfully (CLAUDE.md 11).
 * A page that invents them to look established is the exact failure this site
 * argues against, so the page is built from what is true instead.
 *
 * The product names come from the MDX frontmatter rather than being typed here,
 * so this page cannot drift from /solutions. Adding a product updates both.
 *
 * Surface rhythm: N N I N. The footer supplies the closing inverted band and
 * its own CTA, so the page ends on a normal surface rather than stacking two
 * inverted passages and repeating the conversion block directly above it.
 */
export default function AboutPage() {
  const names = getSolutions().map((solution) => solution.name);
  const productList = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
  }).format(names);

  return (
    <>
      <PageHeader
        eyebrow="Sys.About"
        title="Technology should be useful."
        intro="Sarva Tech exists to make technology practical. Most of it is not."
      />

      <Container as="section" className="pb-section" aria-labelledby="about-products">
        <div className="measure">
          <h2 id="about-products" className="text-h3">
            We build our own products.
          </h2>
          <p className="text-lead mt-4">
            Most companies that write software for other people never have to live with what
            they shipped. We do. {productList} are ours — we decided what they should be,
            built them, and answer for them when something is wrong.
          </p>
          <p className="text-muted mt-4">
            That changes how we work on someone else&rsquo;s project. A decision that reads
            well in a proposal reads differently when you are the one explaining it to a
            user at nine in the morning. Client work and our own work are the same craft,
            and neither gets the cheaper version of it.
          </p>
          <p className="mt-6">
            <Link
              href="/solutions"
              className="text-accent-text rounded-xs underline-offset-4 hover:underline"
            >
              See what we have built
            </Link>
          </p>
        </div>
      </Container>

      <section data-surface="inverted" aria-labelledby="about-friction">
        <Container className="py-section">
          <div className="measure">
            <h2 id="about-friction" className="text-h3">
              The goal is less friction, not more software.
            </h2>
            <p className="text-lead mt-4">
              Most problems brought to a technology company are not software problems yet.
              Someone is retyping numbers from one system into another. A driver is phoning
              in a location because there is nowhere to enter it. An order gets confirmed
              twice because nobody can see the first confirmation.
            </p>
            <p className="text-muted mt-4">
              The useful answer is often smaller than the one people arrive expecting, and
              occasionally it is not a new product at all. We would rather remove a step
              than build a screen for it. A company that measures itself by how much it
              ships will always find a reason to ship more, and the person using it pays for
              that in time they do not get back.
            </p>
          </div>
        </Container>
      </section>

      <Container as="section" className="py-section" aria-labelledby="about-intent">
        <div className="measure">
          <h2 id="about-intent" className="text-h3">
            One company, several products.
          </h2>
          <p className="text-lead mt-4">
            The intention is for Sarva Tech to be the name behind a number of products, each
            solving something specific and sharing what they sensibly can.
          </p>
          <p className="text-muted mt-4">
            Today there are {names.length}. That is a description of where things stand
            rather than a claim about what is coming — the rest have to be built and earned
            one at a time, and we would rather give you the count than a story about it.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <ButtonLink href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</ButtonLink>
          <ButtonLink href="/solutions" variant="secondary">
            Explore What We Build
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
