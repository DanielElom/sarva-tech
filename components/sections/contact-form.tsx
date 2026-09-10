'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, Field, controlClasses } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { CONTACT } from '@/lib/site';
import {
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  type ContactMethod,
  type SubmissionResponse,
} from '@/lib/form-options';

/** Loaded on demand — see the note in components/sections/intake-flow.tsx. */
let schemasPromise: Promise<typeof import('@/lib/schemas')> | null = null;
function loadSchemas() {
  schemasPromise ??= import('@/lib/schemas');
  return schemasPromise;
}

/**
 * The short message form. CLAUDE.md 9 keeps this deliberately different from
 * the intake: one screen, no steps, and no questions we do not need answered
 * before a reply.
 *
 * Nothing here is persisted. It is one screen, so there is no mid-flow refresh
 * to protect against, and it is all contact details.
 */
type Status =
  | { state: 'editing' }
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'failed'; message: string };

export function ContactForm() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
    preferredContact: 'email' as ContactMethod,
  });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: 'editing' });
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const warm = () => void loadSchemas();
    const id =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(warm, { timeout: 2500 })
        : window.setTimeout(warm, 600);
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id as number);
      } else {
        window.clearTimeout(id);
      }
    };
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { kind: 'contact' as const, ...values, website: honeypot };

    const { contactSchema } = await loadSchemas();
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus({ state: 'sending' });
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as SubmissionResponse;
      if (!response.ok || !body.ok) {
        if (!body.ok && body.fieldErrors) setErrors(body.fieldErrors);
        setStatus({
          state: 'failed',
          message:
            !body.ok && body.error
              ? body.error
              : 'That did not send. Try again, or message us on WhatsApp.',
        });
        return;
      }
      setStatus({ state: 'sent' });
      window.setTimeout(() => successRef.current?.focus(), 0);
    } catch {
      setStatus({
        state: 'failed',
        message:
          'That did not reach us — the connection dropped. Your message is still here, so try again, or message us on WhatsApp.',
      });
    }
  };

  if (status.state === 'sent') {
    return (
      <div className="elevated rounded-lg p-8">
        <p
          ref={successRef}
          tabIndex={-1}
          className="text-h3 font-display tracking-heading outline-none"
        >
          Message received.
        </p>
        <p className="text-muted mt-4">
          We read these ourselves and reply within two working days. If it is urgent,
          WhatsApp is faster.
        </p>
        <a
          href={CONTACT.whatsappUrl}
          className="text-accent-text mt-5 inline-flex rounded-xs text-sm underline-offset-4 hover:underline"
        >
          WhatsApp {CONTACT.whatsappNumber}
        </a>
      </div>
    );
  }

  const sending = status.state === 'sending';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <Field label="Name" error={errors.name} required>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className={controlClasses}
          />
        )}
      </Field>
      <Field label="Email" error={errors.email} required>
        {(props) => (
          <input
            {...props}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            className={controlClasses}
          />
        )}
      </Field>
      <Field label="Phone" error={errors.phone}>
        {(props) => (
          <input
            {...props}
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            className={controlClasses}
          />
        )}
      </Field>
      <Field label="Organization" error={errors.organization}>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="organization"
            value={values.organization}
            onChange={(e) => setValues((v) => ({ ...v, organization: e.target.value }))}
            className={controlClasses}
          />
        )}
      </Field>
      <Field label="What are you working on?" error={errors.message} required>
        {(props) => (
          <textarea
            {...props}
            rows={6}
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            className={cn(controlClasses, 'resize-y')}
          />
        )}
      </Field>
      <ChoiceGroup
        legend="How should we reach you?"
        name="preferredContact"
        options={CONTACT_METHODS.map((m) => CONTACT_METHOD_LABELS[m])}
        value={CONTACT_METHOD_LABELS[values.preferredContact]}
        onChange={(label) => {
          const found = CONTACT_METHODS.find((m) => CONTACT_METHOD_LABELS[m] === label);
          if (found) setValues((v) => ({ ...v, preferredContact: found }));
        }}
        error={errors.preferredContact}
        columns={2}
      />

      {status.state === 'failed' ? (
        <p role="alert" className="border-status-down text-primary border-l-2 pl-4 text-sm">
          {status.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send Message'}
        </Button>
        <span aria-live="polite" className="text-muted text-sm">
          {sending ? 'Sending your message…' : ''}
        </span>
      </div>
    </form>
  );
}
