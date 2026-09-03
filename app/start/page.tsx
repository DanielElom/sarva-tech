import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';
import { Readout } from '@/components/ui/readout';

export const metadata: Metadata = {
  title: 'Start a Project',
  description:
    'Tell Sarva Tech what is not working. Five short steps, and you will hear back with what we would build and what it would take.',
};

/**
 * CLAUDE.md 10: an action keeps the same name through a whole flow. Every
 * "Start a Project" button lands on a page headed "Start a Project".
 * The five-step intake itself is S5.
 */
export default function StartPage() {
  const steps = [
    'The problem',
    'What you have tried',
    'Scope and timing',
    'Budget range',
    'How to reach you',
  ];

  return (
    <>
      <PageHeader
        eyebrow="Sys.Intake"
        title="Start a Project"
        intro="Five short steps. Tell us what is not working and we will come back with what we would build, what it would take, and whether we are the right people for it."
      />
      <Container as="section" className="pb-section">
        <ol className="measure grid gap-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="elevated flex items-center gap-4 rounded-md px-5 py-4"
            >
              <Readout className="text-accent-text">
                {String(index + 1).padStart(2, '0')}
              </Readout>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="measure text-muted mt-8">
          The guided flow, validation and submission handling are built in S5.
        </p>
      </Container>
    </>
  );
}
