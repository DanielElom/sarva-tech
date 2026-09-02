import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Sarva Tech handles the personal data you share with us.',
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Legal"
        title="Privacy Policy"
        intro="How we handle the personal data you share with us."
      />
      <Container as="section" className="pb-section">
        <p className="measure text-muted">The privacy policy is written in S6, alongside the intake flow that will collect the data it describes. This route exists now so the footer link resolves rather than 404.</p>
      </Container>
    </>
  );
}
