import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'What Sarva Tech does: problem discovery, product design, engineering, and shipping and operating what we build.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Services"
        title="Services"
        intro="Problem discovery, product design, engineering, and keeping what we ship working."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">
          The services ecosystem is built in S3. This route exists now so the shell,
          navigation and metadata are complete.
        </p>
      </Container>
    </>
  );
}
