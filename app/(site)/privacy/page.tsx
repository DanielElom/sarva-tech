import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { CONTACT, LEGAL_UPDATED } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  route: '/privacy',
  title: 'Privacy Policy',
  description:
    'What Sarva Tech collects when you use this site, where it is stored, how long it is kept, and how to ask for it to be deleted. No cookies, no analytics, no tracking.',
});

/**
 * Written against what the code actually does, not a template.
 *
 * Every claim here was checked against the source: the columns in
 * supabase/migrations, the row assembled in app/api/intake/route.ts, the
 * in-memory rate limiter in lib/rate-limit.ts, and the two browser storage
 * keys. If any of those change, this page changes with them — a policy that
 * describes cookies and trackers a site does not have is worse than none,
 * because it proves nobody read either one.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sys.Legal"
        title="Privacy Policy"
        intro="What we collect, where it goes, and how to get it removed."
      />

      <Container as="section" className="pb-section">
        <div className="legal">
          <p>Last updated {LEGAL_UPDATED}.</p>

          <p>
            This policy covers this website. It is written to describe what the site
            actually does rather than what a template assumes, so it is short.
          </p>

          <h2>The short version</h2>
          <p>
            We collect nothing at all unless you fill in a form and send it. There are no
            cookies, no analytics, no advertising pixels and no third-party tracking on any
            page of this site.
          </p>

          <h2>What we collect when you contact us</h2>
          <p>
            Two forms send us information: the project intake at{' '}
            <Link href="/start">Start a Project</Link> and the short message form at{' '}
            <Link href="/contact">Contact</Link>. When you submit either one, we receive and
            store:
          </p>
          <ul>
            <li>Your name and email address.</li>
            <li>
              Your phone number and the name of your organisation, if you choose to give
              them. Both are optional.
            </li>
            <li>Which way you would prefer us to reply — email, phone or WhatsApp.</li>
            <li>The message or problem description you wrote.</li>
            <li>
              From the intake flow only: what you want to achieve, the type of organisation,
              and the stage the project is at. These are the choices you select in the first
              four steps.
            </li>
            <li>
              The page the submission came from, the date and time, and your browser&rsquo;s
              user-agent string, which is the line every browser sends identifying itself.
            </li>
          </ul>
          <p>
            We do not ask for and do not store payment details, identity documents, or any
            special category of personal data. Please do not put information in the message
            box that you would not want held in an ordinary business inbox.
          </p>

          <h2>Your IP address</h2>
          <p>
            Both forms are rate limited so that one script cannot flood them. That check
            reads your IP address, counts recent submissions from it in the server&rsquo;s
            memory, and nothing else. Your IP address is not written to our database and
            does not survive a server restart. Our hosting provider keeps its own
            short-lived request logs, as any web host does.
          </p>

          <h2>What is stored on your device</h2>
          <p>
            No cookies are set. Two things are kept in your browser&rsquo;s own storage, and
            both stay on your device — they are never sent to us:
          </p>
          <ul>
            <li>
              Your choice of day or night theme, so the site does not change appearance
              every time you return.
            </li>
            <li>
              A draft of your answers to the first four steps of the intake flow, so an
              accidental refresh does not lose your work. Your name, email and phone number
              from the final step are deliberately excluded from that draft, and the whole
              draft is deleted the moment you submit or when you close the tab.
            </li>
          </ul>

          <h2>Where it goes</h2>
          <p>Submissions are handled by three services, and no others:</p>
          <ul>
            <li>
              <strong>Supabase</strong> stores the submission. It is the record we work
              from. Access is restricted to the server; the key used by your browser cannot
              read or write that table.
            </li>
            <li>
              <strong>Resend</strong> sends us a notification email so we see that you got
              in touch. The email contains what you submitted.
            </li>
            <li>
              <strong>Vercel</strong> hosts the site and runs the code that handles the
              form.
            </li>
          </ul>
          <p>
            These providers process the data on our behalf. We do not sell it, share it for
            advertising, or pass it to anyone else.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep a submission for as long as the enquiry is live and for a reasonable
            period afterwards, so that we have a record of what was discussed. There is no
            automatic deletion, which means the practical answer is: until you ask us to
            remove it, or until we no longer have a business reason to keep it. If you want
            a specific retention period agreed in writing for a project, ask and we will put
            it in the contract.
          </p>

          <h2>Getting your data removed</h2>
          <p>
            Ask us and we will delete it. You can also ask for a copy of what we hold, or
            for something to be corrected. Reach us on WhatsApp at{' '}
            <a href={CONTACT.whatsappUrl}>{CONTACT.whatsappNumber}</a> or through the{' '}
            <Link href="/contact">contact form</Link>. Tell us the name and email address
            you used so we can find the right record. We will confirm when it is done.
          </p>
          <p>
            We do not yet publish an email address for this — the company mailbox is not
            live. WhatsApp reaches us directly and is the faster route in the meantime.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If what the site does changes, this page changes with it and the date at the top
            moves. We will not quietly broaden it.
          </p>
        </div>
      </Container>
    </>
  );
}
