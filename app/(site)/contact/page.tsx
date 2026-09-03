import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';
import { CONTACT, PRIMARY_CTA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Reach Sarva Tech directly on WhatsApp, or send a message. To scope a piece of work, start a project instead.',
};

/**
 * CLAUDE.md 9: /contact is the short route — a message, plus direct WhatsApp.
 * It is deliberately not in the primary navigation so it does not compete with
 * "Start a Project". The form itself lands in S5.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Contact"
        title="Contact Us"
        intro="A short message, or reach us directly on WhatsApp. If you want to scope a piece of work, start a project instead — it asks the right questions."
      />
      <Container as="section" className="pb-section">
        <div className="elevated measure rounded-md p-6">
          <Readout className="text-muted">Direct</Readout>
          <p className="mt-4">
            <a
              href={CONTACT.whatsappUrl}
              className="text-lead text-accent-text rounded-xs underline-offset-4 hover:underline"
            >
              WhatsApp {CONTACT.whatsappNumber}
            </a>
          </p>
          <p className="text-muted mt-3 text-sm">
            An email address goes live with the domain. We are not listing one we cannot yet
            receive on.
          </p>
        </div>
        <p className="measure text-muted mt-8">
          The message form is built in S5, together with validation, rate limiting and the
          Supabase-first submission path.
        </p>
        <div className="mt-8">
          <ButtonLink href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</ButtonLink>
        </div>
      </Container>
    </>
  );
}
