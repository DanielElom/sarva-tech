import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'About',
  description: 'Who Sarva Tech is, how we work, and why the company exists.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.About"
        title="About"
        intro="Who we are, how we work, and why this company exists."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">The about page is written in S6. This route exists now so the shell, navigation and metadata are complete.</p>
      </Container>
    </>
  );
}
