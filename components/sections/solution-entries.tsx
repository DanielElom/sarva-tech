import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import type { Solution } from '@/lib/solutions';

/**
 * The solutions, in full.
 *
 * Every field comes from the MDX frontmatter — nothing here is hardcoded, so
 * adding an entry is adding a file.
 *
 * `publicUrl` is optional by design. Domains are not live yet, so an entry has
 * to read as complete without one: the link is simply absent, and appears when
 * a value is added, with no change to this component. That is why the status
 * and the link are separate things rather than one conditional block.
 */
export function SolutionEntries({ solutions }: { solutions: Solution[] }) {
  return (
    <Container as="section" className="py-section" aria-labelledby="solutions-heading">
      <h2 id="solutions-heading" className="sr-only">
        Our products
      </h2>

      <div className="flex flex-col">
        {solutions.map((solution) => (
          <article
            key={solution.slug}
            id={solution.slug}
            className="border-line scroll-mt-28 border-t py-12 first:border-t-0 first:pt-0"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <h3 className="text-h3">{solution.name}</h3>
                <p className="text-accent-text mt-2 text-sm font-medium">
                  {solution.tagline}
                </p>
                <p className="text-muted mt-4 text-sm">{solution.status}</p>
                {solution.publicUrl ? (
                  <ButtonLink
                    href={solution.publicUrl}
                    variant="secondary"
                    size="sm"
                    className="mt-5"
                  >
                    Visit {solution.name}
                  </ButtonLink>
                ) : null}
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-muted text-sm">The problem</h4>
                  <p className="measure text-lead mt-1.5">{solution.problem}</p>
                </div>
                <div>
                  <h4 className="text-muted text-sm">What it does</h4>
                  <p className="measure text-lead mt-1.5">{solution.description}</p>
                </div>
                <div>
                  <h4 className="text-muted text-sm">Built with</h4>
                  <p className="measure mt-1.5">{solution.technologies.join(', ')}.</p>
                </div>
                {solution.capabilities?.length ? (
                  <div>
                    <h4 className="text-muted text-sm">Includes</h4>
                    <p className="measure mt-1.5">{solution.capabilities.join(', ')}.</p>
                  </div>
                ) : null}
                {solution.body ? (
                  <p className="measure text-muted">{solution.body}</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Container>
  );
}
