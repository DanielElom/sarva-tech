import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Case studies: what the problem was, what we built, and what changed as a result.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Work"
        title="Work"
        intro="What the problem was, what we built, and what changed as a result."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">
          Four case studies are published in S4, with client permission confirmed for each
          named client. This route exists now so the shell, navigation and metadata are
          complete.
        </p>
      </Container>
    </>
  );
}
