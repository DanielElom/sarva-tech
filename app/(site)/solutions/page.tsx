import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'The problems Sarva Tech solves, and the shape of the solutions we build for them.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Solutions"
        title="Solutions"
        intro="The problems we solve, and what the solution usually looks like."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">Solution entries come from MDX content in S4. This route exists now so the shell, navigation and metadata are complete.</p>
      </Container>
    </>
  );
}
