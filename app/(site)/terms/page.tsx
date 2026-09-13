import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { CONTACT, LEGAL_UPDATED, SITE } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  route: '/terms',
  title: 'Terms of Service',
  description:
    'The terms that apply to using the Sarva Tech website. Short, and limited to the website itself — project work is governed by its own written agreement.',
});

/**
 * Proportionate to what this actually is: a marketing site with two contact
 * forms. It makes no promises about uptime, response times or deliverables,
 * because nobody has agreed to any and a term nobody agreed to is not a term.
 * Anything about actual project work is explicitly pushed to the contract that
 * would govern it.
 */
export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Legal"
        title="Terms of Service"
        intro="The terms that apply to using this website."
      />

      <Container as="section" className="pb-section">
        <div className="legal">
          <p>Last updated {LEGAL_UPDATED}.</p>

          <p>
            These terms cover this website and nothing more. If we work together on a
            project, that work is governed by a separate written agreement between us, and
            that agreement takes precedence over anything on this page.
          </p>

          <h2>Using the site</h2>
          <p>
            You are welcome to read the site, and to use the forms to get in touch. In
            return, please do not attack it: no attempting to break, overload or gain
            unauthorised access to the site or the systems behind it, no scraping it to
            impersonate us, and no using the forms to send unlawful, abusive or automated
            content. The forms are rate limited, and we may block access that is abusing
            them.
          </p>

          <h2>What is on the site</h2>
          <p>
            We try to keep everything here accurate and current, and we correct mistakes
            when we find them. Even so, the pages describe our work in general terms. They
            are not an offer, a quote, or a commitment to deliver anything specific. Nothing
            here forms a contract. A price, a scope or a timeline only becomes real when it
            is written into an agreement we have both signed.
          </p>
          <p>
            Descriptions of our own products reflect their state at the time of writing.
            Products in testing are labelled as such, and that label is the whole status —
            we do not publish release dates we cannot stand behind.
          </p>

          <h2>Availability</h2>
          <p>
            The site is provided as it is. We do not promise that it will be available
            without interruption or free of errors, and we may change, move or remove any
            part of it without notice. We are not offering a service level here, because
            this is a website rather than a service you have bought.
          </p>

          <h2>What you send us</h2>
          <p>
            You keep ownership of whatever you send through the forms. By sending it, you
            give us permission to read it, store it and use it to respond to you and assess
            whether we can help. We treat the contents as confidential and handle them as
            described in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <p>
            Only send material you have the right to send. Please do not send confidential
            information belonging to someone else through a web form.
          </p>

          <h2>Our material</h2>
          <p>
            The design, text, code and branding of this site belong to {SITE.name} unless
            stated otherwise. You may read it, link to it and quote it with attribution. You
            may not republish it as your own or present it as somebody else&rsquo;s work.
          </p>

          <h2>Third-party links</h2>
          <p>
            Some pages link to sites we do not run. We are not responsible for what is on
            them or what they do with your data.
          </p>

          <h2>Liability</h2>
          <p>
            To the extent the law allows, we are not liable for loss arising from your use
            of this website, including any decision taken on the basis of information
            published here. Nothing in these terms limits liability that cannot legally be
            limited, such as liability for fraud.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of the Federal Republic of Nigeria, and the
            Nigerian courts have jurisdiction over any dispute arising from them.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms. The current version is always the one on this page,
            and the date at the top tells you when it last changed.
          </p>

          <h2>Questions</h2>
          <p>
            Ask us on WhatsApp at <a href={CONTACT.whatsappUrl}>{CONTACT.whatsappNumber}</a>
            , or through the <Link href="/contact">contact form</Link>.
          </p>
        </div>
      </Container>
    </>
  );
}
