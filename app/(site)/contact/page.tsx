import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button';
import { ContactForm } from '@/components/sections/contact-form';
import { CONTACT, PRIMARY_CTA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Have a problem, an idea, or a product that needs to become real? Message Sarva Tech on WhatsApp, or send us a note.',
  alternates: { canonical: '/contact' },
};

/**
 * CLAUDE.md 9 and 11.
 *
 * WhatsApp comes FIRST, not under the form. A lot of enquiry here starts on
 * WhatsApp, and burying it below a five-field form asks people to use the
 * channel we prefer rather than the one they were already going to use.
 *
 * No email address: there is not one yet and inventing one would be worse than
 * its absence. No socials, no address, for the same reason.
 *
 * Surface rhythm: N N I. The WhatsApp band takes the inversion — it is the one
 * thing on this page we want noticed before anything else, and the footer's
 * band is far enough down not to abut it.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Contact"
        title="Let's solve something together."
        intro="Have a problem, an idea, or a product that needs to become real? Tell us what you are working on."
      />

      <section data-surface="inverted" aria-labelledby="contact-direct-heading">
        <Container className="py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="measure">
              <h2 id="contact-direct-heading" className="text-h3">
                WhatsApp is the fastest way to reach us.
              </h2>
              <p className="text-muted mt-3">
                Most conversations here start with a message. Ours usually get answered the
                same day.
              </p>
            </div>
            <ButtonLink href={CONTACT.whatsappUrl} className="shrink-0">
              Message {CONTACT.whatsappNumber}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container as="section" className="py-section" aria-labelledby="contact-form-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="contact-form-heading" className="text-h3">
              Or send a note.
            </h2>
            <p className="text-muted mt-4">
              Anything we should know before replying. If you would rather answer questions
              than write from scratch, the intake asks them for you.
            </p>
            <ButtonLink href={PRIMARY_CTA.href} variant="secondary" size="sm" className="mt-6">
              {PRIMARY_CTA.label}
            </ButtonLink>
            <p className="text-muted mt-8 text-sm">
              An email address goes live with the domain. We are not listing one we cannot
              yet receive on.
            </p>
          </div>
          <div className="measure w-full">
            <ContactForm />
          </div>
        </div>
      </Container>
    </>
  );
}
