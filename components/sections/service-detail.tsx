import { Container } from '@/components/ui/container';
import { SERVICES } from '@/lib/services';

/**
 * The five categories in full, always visible.
 *
 * Four fields each, in the same order every time, so the five can be compared
 * and not merely read. The field labels are the quiet part and the answers are
 * the loud part, which is the opposite of how a spec table usually reads and
 * the right way round for a page someone is scanning to find themselves in.
 *
 * `:target` marks whichever category the ecosystem map sent the reader to, so
 * arriving at an anchor lands somewhere obviously selected rather than at an
 * arbitrary scroll position. That is CSS; nothing here needs JavaScript.
 *
 * Technology names sit in the body face. CLAUDE.md 4.6 keeps the monospace
 * readout for instrumentation, and a list of tools is content.
 */

const FIELDS = [
  { key: 'solves', label: 'What it solves' },
  { key: 'deliver', label: 'What we deliver' },
  { key: 'builtWith', label: 'Built with' },
  { key: 'outcome', label: 'The outcome' },
] as const;

export function ServiceDetail() {
  return (
    <Container
      as="section"
      className="py-section"
      aria-labelledby="services-detail-heading"
    >
      <h2 id="services-detail-heading" className="sr-only">
        Service categories in detail
      </h2>

      <div className="flex flex-col">
        {SERVICES.map((service) => (
          <article
            key={service.id}
            id={service.id}
            className="service-entry border-line scroll-mt-28 border-t py-12 first:border-t-0 first:pt-0"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-16">
              <h3 className="text-h3 lg:sticky lg:top-28 lg:self-start">{service.name}</h3>

              <dl className="flex flex-col gap-6">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <dt className="text-muted text-sm">{field.label}</dt>
                    <dd className="measure text-lead mt-1.5">{service[field.key]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </div>
    </Container>
  );
}
