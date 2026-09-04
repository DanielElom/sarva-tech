import { Container } from '@/components/ui/container';

/**
 * What we do. Five categories.
 *
 * Five items do not divide into three columns, and the usual answers are both
 * bad: a dangling fifth card, or five identical rounded boxes with the same
 * shadow, which is the templated default CLAUDE.md 4.6 rejects.
 *
 * The layout answers it with hierarchy instead of arithmetic. Product
 * development is the lead — it is what most visitors arrive wanting — so it
 * takes a raised panel one column wide and two rows tall, and the remaining
 * four sit beside it as hairline-separated entries with no fill and no shadow.
 * Three columns by two rows, six cells, one of them double. Nothing is orphaned
 * and the five are not pretending to be equal when they are not.
 *
 * The radius scale carries the same distinction: the panel takes `lg`, which
 * this system reserves for full panels, and the plain entries take none.
 */

type Capability = { title: string; body: string };

const LEAD: Capability = {
  title: 'Product development',
  body: 'Web and mobile applications, SaaS platforms, and custom software, built to be used rather than demonstrated.',
};

const REST: Capability[] = [
  {
    title: 'Technology strategy',
    body: 'Deciding what to build and why, before anyone writes code.',
  },
  {
    title: 'Rescue and optimization',
    body: 'Systems that are slow, breaking, or half-finished, made to work.',
  },
  {
    title: 'Digital infrastructure',
    body: 'Cloud, APIs, databases, and deployment that hold up under real load.',
  },
  {
    title: 'Technology talent',
    body: 'Access to engineers who can do the work, when you need more hands than you have.',
  },
];

export function WhatWeDo() {
  return (
    <Container as="section" className="py-section" aria-labelledby="what-we-do-heading">
      <div className="measure">
        <h2 id="what-we-do-heading" className="text-h2">
          Most technology creates work. Ours removes it.
        </h2>
        <p className="mt-5 text-lead text-muted">
          We work across the whole lifecycle, from the first conversation about what&rsquo;s
          actually broken through to the system running in production and getting better.
        </p>
      </div>

      <ul className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
        <li className="elevated rounded-lg p-7 md:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex lg:flex-col lg:justify-center">
          <h3 className="text-h3">{LEAD.title}</h3>
          <p className="mt-4 text-muted">{LEAD.body}</p>
        </li>

        {REST.map((item) => (
          <li key={item.title} className="border-t border-line pt-6">
            <h3 className="text-h4">{item.title}</h3>
            <p className="mt-3 text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
