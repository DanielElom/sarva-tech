import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply to using the Sarva Tech website.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Legal"
        title="Terms of Service"
        intro="The terms that apply to using this website."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">The terms of service are written in S6. This route exists now so the footer link resolves rather than 404.</p>
      </Container>
    </>
  );
}
