import 'server-only';

import { Resend } from 'resend';
import type { SubmissionInput } from './schemas.server';

/**
 * The notification email. CLAUDE.md 9: this runs AFTER the row is written, and
 * its failure must never fail the submission.
 *
 * The domain is not verified yet, so this sends from Resend's test address.
 * Real domain verification is on the pre-launch checklist (CLAUDE.md 13).
 */
const FROM = process.env.RESEND_FROM?.trim() || 'Sarva Tech <onboarding@resend.dev>';

export type NotifyResult = { sent: true } | { sent: false; reason: string };

function line(label: string, value: string | null | undefined) {
  return value ? `${label}: ${value}` : null;
}

export async function notifySubmission(
  input: SubmissionInput,
  id: string,
): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.SUBMISSION_NOTIFY_TO?.trim();

  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY not set.' };
  if (!to) return { sent: false, reason: 'SUBMISSION_NOTIFY_TO not set.' };

  const heading =
    input.kind === 'intake' ? 'New project intake' : 'New contact message';

  const body = [
    `${heading} — ${id}`,
    '',
    line('Name', input.name),
    line('Email', input.email),
    line('Phone', input.phone || null),
    line('Organization', input.organization || null),
    line('Prefers', input.preferredContact),
    '',
    input.kind === 'intake' ? line('Goal', input.goal) : null,
    input.kind === 'intake' ? line('Organization type', input.organizationType) : null,
    input.kind === 'intake' ? line('Stage', input.projectStage) : null,
    input.kind === 'intake' ? '' : null,
    'Message:',
    input.message,
  ]
    .filter((value) => value !== null)
    .join('\n');

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      replyTo: input.email,
      subject: `${heading}: ${input.name}`,
      text: body,
    });
    if (error) return { sent: false, reason: error.message || 'Resend rejected the send.' };
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Unknown Resend failure.',
    };
  }
}
