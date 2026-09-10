import { NextResponse } from 'next/server';
import type { SubmissionResponse } from '@/lib/form-options';
import { submissionSchema } from '@/lib/schemas.server';
import { getServiceClient } from '@/lib/supabase-server';
import { notifySubmission } from '@/lib/notify';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

/**
 * POST /api/intake — both /start and /contact post here.
 *
 * Order is the point (CLAUDE.md 9):
 *
 *   1. Write to Supabase. The table is the source of truth.
 *   2. Then try the notification email.
 *
 * If step 2 fails, the submission still SUCCEEDS. The row carries
 * notified=false and the reason, so a failed send is a thing to retry rather
 * than a lead that quietly never existed. The opposite order — email first, or
 * failing the request when email fails — loses leads to a mail problem, which
 * is exactly what that section forbids.
 *
 * Nothing the client says is trusted: the same schema it used is re-run here.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The honeypot's field name. Never echoed back — see below. */
const HONEYPOT_FIELD = 'website';

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    /*
     * The honeypot is deliberately absent from the response. Returning
     * "website: this submission looks automated" tells a bot precisely which
     * field to leave alone next time, which turns the trap into a tutorial.
     * A bot gets the same generic rejection as a person with a genuinely
     * invalid form, and learns nothing.
     */
    if (!key || key === HONEYPOT_FIELD) continue;
    errors[key] ??= issue.message;
  }
  return errors;
}

export async function POST(request: Request): Promise<NextResponse<SubmissionResponse>> {
  const limit = checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `That is more submissions than we accept from one address in ten minutes. Wait ${Math.ceil(limit.retryAfter / 60)} minute(s) and try again, or message us on WhatsApp.`,
      },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'That request was not readable. Reload the page and try again.' },
      { status: 400 },
    );
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return NextResponse.json(
      {
        ok: false,
        error: 'Some answers need fixing before this can be sent.',
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const submission = parsed.data;

  const supabase = getServiceClient();
  if (!supabase.configured) {
    // Not configured means we cannot store the lead, and storing is the point.
    // Reporting success here would be the exact dishonesty CLAUDE.md 8 forbids.
    console.error('[intake] Supabase not configured:', supabase.reason);
    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not record this — our storage is unreachable right now. Message us on WhatsApp and it will reach us directly.',
      },
      { status: 503 },
    );
  }

  const row = {
    kind: submission.kind,
    name: submission.name,
    email: submission.email,
    phone: submission.phone || null,
    organization: submission.organization || null,
    preferred_contact: submission.preferredContact,
    message: submission.message,
    goal: submission.kind === 'intake' ? submission.goal : null,
    organization_type: submission.kind === 'intake' ? submission.organizationType : null,
    project_stage: submission.kind === 'intake' ? submission.projectStage : null,
    source_path: submission.kind === 'intake' ? '/start' : '/contact',
    user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
  };

  const { data, error } = await supabase.client
    .from('submissions')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[intake] insert failed:', error?.message);
    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not record this. Nothing was saved, so nothing was half-sent. Try again, or message us on WhatsApp.',
      },
      { status: 502 },
    );
  }

  // The lead is safe from here on. Everything below is best-effort.
  const notified = await notifySubmission(submission, data.id);
  if (!notified.sent) {
    console.error('[intake] notification failed for', data.id, '-', notified.reason);
    await supabase.client
      .from('submissions')
      .update({ notified: false, notify_error: notified.reason.slice(0, 500) })
      .eq('id', data.id);
  } else {
    await supabase.client.from('submissions').update({ notified: true }).eq('id', data.id);
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
