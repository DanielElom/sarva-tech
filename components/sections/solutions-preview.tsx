import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { getFeaturedSolutions } from '@/lib/solutions';

/**
 * The homepage's proof step (CLAUDE.md 1: ... what we build → proof → start a
 * project). The page used to run straight from "what we build with" into the
 * footer, so the one part of the argument backed by shipped products was
 * missing.
 *
 * Reads the same MDX as /solutions. Nothing here is hardcoded: adding an entry
 * changes both pages, and the two can never drift.
 */
export function SolutionsPreview() {
  const solutions = getFeaturedSolutions(2);

  return (
    <Container
      as="section"
      className="py-section"
      aria-labelledby="solutions-preview-heading"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="measure">
          <h2 id="solutions-preview-heading" className="text-h2">
            We build our own products too.
          </h2>
          <p className="text-lead text-muted mt-5">
            The same approach, applied to problems we chose ourselves.
          </p>
        </div>
        <Link
          href="/solutions"
          className="text-accent-text shrink-0 rounded-xs underline-offset-4 hover:underline"
        >
          See all solutions
        </Link>
      </div>

      <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {solutions.map((solution) => (
          <li key={solution.slug} className="border-line border-t pt-6">
            <h3 className="text-h4">{solution.name}</h3>
            <p className="text-accent-text mt-1.5 text-sm font-medium">
              {solution.tagline}
            </p>
            <p className="text-muted mt-4">{solution.description}</p>
            <p className="text-muted mt-4 text-sm">{solution.status}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
