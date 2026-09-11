'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Container } from '@/components/ui/container';
import { Button, ButtonLink } from '@/components/ui/button';
import { ChoiceGroup, Field, controlClasses } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { CONTACT } from '@/lib/site';
import {
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  GOALS,
  ORGANIZATION_TYPES,
  PROJECT_STAGES,
  type ContactMethod,
  type SubmissionResponse,
} from '@/lib/form-options';

/**
 * The validators arrive on demand, not at first paint.
 *
 * Nothing is validated until a step is submitted, and zod is 16KB gzipped —
 * enough on its own to take this route past the payload cap. Loading it when
 * the flow is first touched keeps it out of the initial payload and inside the
 * deferred budget (CLAUDE.md 6), with no change to what gets validated.
 *
 * It is warmed on first interaction rather than fetched on submit, so by the
 * time anyone reaches "Continue" it is already there.
 */
type Schemas = typeof import('@/lib/schemas');
let schemasPromise: Promise<Schemas> | null = null;
function loadSchemas(): Promise<Schemas> {
  schemasPromise ??= import('@/lib/schemas');
  return schemasPromise;
}

/**
 * The five-step project intake. CLAUDE.md 9: this should read as product
 * onboarding, not a contact form.
 *
 * What makes it onboarding rather than a long form: one question per screen,
 * visible progress, and the ability to go back without losing an answer. What
 * makes it usable: it is a real <form> per step with real controls, so keyboard
 * alone gets through it (CLAUDE.md 7) without this component implementing key
 * handling of its own. Enter submits a step because that is what Enter does in
 * a form.
 *
 * Draft persistence survives an accidental refresh (sessionStorage), and stops
 * hard at step 5: the contact details are never written to storage. Somebody
 * else on a shared machine should not be able to reopen the tab and read a name,
 * an email and a phone number.
 *
 * Step transitions are CSS. The reduced-motion rule in globals.css flattens
 * them without this component knowing anything about it.
 */

const DRAFT_KEY = 'sarva-intake-draft';
const TOTAL_STEPS = 5;

type Draft = {
  goal: string | null;
  message: string;
  organizationType: string | null;
  projectStage: string | null;
};

const EMPTY_DRAFT: Draft = {
  goal: null,
  message: '',
  organizationType: null,
  projectStage: null,
};

type Details = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  preferredContact: ContactMethod;
};

const EMPTY_DETAILS: Details = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  preferredContact: 'email',
};

const STEP_TITLES = [
  'What are you trying to solve?',
  'Tell us about the problem.',
  'What kind of organization are you?',
  'What stage are you at?',
  'How can we reach you?',
] as const;

type Status =
  | { state: 'editing' }
  | { state: 'sending' }
  | { state: 'sent'; id: string }
  | { state: 'failed'; message: string };

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      goal: typeof parsed.goal === 'string' ? parsed.goal : null,
      message: typeof parsed.message === 'string' ? parsed.message : '',
      organizationType:
        typeof parsed.organizationType === 'string' ? parsed.organizationType : null,
      projectStage: typeof parsed.projectStage === 'string' ? parsed.projectStage : null,
    };
  } catch {
    return null;
  }
}

export function IntakeFlow() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: 'editing' });
  const [restored, setRestored] = useState(false);
  /*
   * Nothing is written to storage until a restore has been attempted.
   *
   * Without this the persist effect runs on mount with the empty initial draft
   * and overwrites the saved one before the restore effect ever reads it — so a
   * refresh silently destroyed exactly the answers it was supposed to protect.
   */
  const [hydrated, setHydrated] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const baseId = useId();
  const panelId = `${baseId}-step`;

  // Restore a draft after an accidental refresh. Deliberately not synchronous
  // in the effect body — see the note in components/chrome/use-theme.ts.
  useEffect(() => {
    const restore = () => {
      const saved = readDraft();
      const hasContent =
        saved &&
        (saved.goal || saved.message || saved.organizationType || saved.projectStage);
      if (saved && hasContent) {
        setDraft(saved);
        setRestored(true);
      }
      // Set last, and unconditionally: persistence stays off until the restore
      // has had its chance, whether or not it found anything.
      setHydrated(true);
    };
    const id = window.setTimeout(restore, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Persist steps 1-4 only. Step 5 is personal data and never goes to storage.
  useEffect(() => {
    if (!hydrated || status.state === 'sent') return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Private mode. The flow still works, it just will not survive a refresh.
    }
  }, [draft, hydrated, status.state]);

  // Warm the validator chunk while the person is still reading step one.
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

  const focusHeading = useCallback(() => {
    headingRef.current?.focus();
  }, []);

  const validateStep = async (index: number): Promise<boolean> => {
    const { intakeStepSchemas } = await loadSchemas();
    const schema = intakeStepSchemas[index]!;
    const candidate =
      index === 0
        ? { goal: draft.goal }
        : index === 1
          ? { message: draft.message }
          : index === 2
            ? { organizationType: draft.organizationType }
            : index === 3
              ? { projectStage: draft.projectStage }
              : details;

    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const goTo = (index: number) => {
    setErrors({});
    setStep(index);
    // Move focus to the new step's heading so a screen reader announces the
    // change and a keyboard user does not get dropped at the top of the page.
    window.setTimeout(focusHeading, 0);
  };

  const onSubmitStep = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!(await validateStep(step))) return;

    if (step < TOTAL_STEPS - 1) {
      goTo(step + 1);
      return;
    }

    setStatus({ state: 'sending' });
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'intake',
          goal: draft.goal,
          message: draft.message,
          organizationType: draft.organizationType,
          projectStage: draft.projectStage,
          ...details,
          website: honeypot,
        }),
      });
      const body = (await response.json()) as SubmissionResponse;
      if (!response.ok || !body.ok) {
        const message =
          !body.ok && body.error
            ? body.error
            : 'That did not send. Try again, or message us on WhatsApp.';
        if (!body.ok && body.fieldErrors) setErrors(body.fieldErrors);
        setStatus({ state: 'failed', message });
        return;
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to clean up */
      }
      setStatus({ state: 'sent', id: body.id });
      window.setTimeout(focusHeading, 0);
    } catch {
      setStatus({
        state: 'failed',
        message:
          'That did not reach us — the connection dropped. Your answers are still here, so try again, or message us on WhatsApp.',
      });
    }
  };

  if (status.state === 'sent') {
    return (
      <Container as="section" className="py-section">
        <div className="measure">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-h1 leading-display tracking-display outline-none"
          >
            That is with us.
          </h1>
          <p className="text-lead text-muted mt-6">
            We read every one of these ourselves. You will hear back within two working
            days, on the channel you asked for.
          </p>
          <p className="text-muted mt-4 text-sm">
            Reference {status.id.slice(0, 8)} — quote it if you follow up.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/solutions" variant="secondary">
              See What We Build
            </ButtonLink>
            <a
              href={CONTACT.whatsappUrl}
              className="text-accent-text inline-flex items-center rounded-xs text-sm underline-offset-4 hover:underline"
            >
              Or message us on WhatsApp
            </a>
          </div>
        </div>
      </Container>
    );
  }

  const sending = status.state === 'sending';

  return (
    <Container as="section" className="py-section">
      <div className="measure">
        {/* Progress. A real progressbar, so it is announced, plus text. */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted text-sm">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
          <p className="text-muted text-sm">{STEP_TITLES[step]}</p>
        </div>
        <div
          role="progressbar"
          aria-label="Progress through the intake"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${TOTAL_STEPS}: ${STEP_TITLES[step]}`}
          className="bg-line mt-3 h-1 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-accent h-full transition-[width] duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {restored && step === 0 ? (
          <p className="border-line text-muted mt-6 border-l-2 pl-4 text-sm">
            We kept your answers from last time. Change anything you like.
          </p>
        ) : null}

        <form onSubmit={onSubmitStep} noValidate>
          {/* The honeypot. Off-screen, not display:none, and taken out of the
              tab order and the accessibility tree — a person never meets it. */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor={`${baseId}-website`}>Website</label>
            <input
              id={`${baseId}-website`}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <div key={step} id={panelId} className="state-in mt-10">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-h2 tracking-heading outline-none"
            >
              {STEP_TITLES[step]}
            </h1>

            <div className="mt-8">
              {step === 0 ? (
                <ChoiceGroup
                  legend="Pick the closest one. We will get to the detail next."
                  name="goal"
                  options={GOALS}
                  value={draft.goal}
                  onChange={(goal) => setDraft((d) => ({ ...d, goal }))}
                  error={errors.goal}
                  columns={2}
                />
              ) : null}

              {step === 1 ? (
                <Field
                  label="What is going wrong, or what do you want to exist?"
                  hint="Plain words are fine. What you would say out loud is better than a spec."
                  error={errors.message}
                  required
                >
                  {(props) => (
                    <textarea
                      {...props}
                      rows={8}
                      value={draft.message}
                      onChange={(event) =>
                        setDraft((d) => ({ ...d, message: event.target.value }))
                      }
                      className={cn(controlClasses, 'resize-y')}
                      placeholder="We take orders on WhatsApp and copy them into a spreadsheet by hand..."
                    />
                  )}
                </Field>
              ) : null}

              {step === 2 ? (
                <ChoiceGroup
                  legend="It changes what we would suggest, not whether we are interested."
                  name="organizationType"
                  options={ORGANIZATION_TYPES}
                  value={draft.organizationType}
                  onChange={(organizationType) =>
                    setDraft((d) => ({ ...d, organizationType }))
                  }
                  error={errors.organizationType}
                  columns={2}
                />
              ) : null}

              {step === 3 ? (
                <ChoiceGroup
                  legend="Wherever you actually are. Earlier is not worse."
                  name="projectStage"
                  options={PROJECT_STAGES}
                  value={draft.projectStage}
                  onChange={(projectStage) => setDraft((d) => ({ ...d, projectStage }))}
                  error={errors.projectStage}
                />
              ) : null}

              {step === 4 ? (
                <div className="flex flex-col gap-5">
                  <Field label="Name" error={errors.name} required>
                    {(props) => (
                      <input
                        {...props}
                        type="text"
                        autoComplete="name"
                        value={details.name}
                        onChange={(event) =>
                          setDetails((d) => ({ ...d, name: event.target.value }))
                        }
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
                        value={details.email}
                        onChange={(event) =>
                          setDetails((d) => ({ ...d, email: event.target.value }))
                        }
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
                        value={details.phone}
                        onChange={(event) =>
                          setDetails((d) => ({ ...d, phone: event.target.value }))
                        }
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
                        value={details.organization}
                        onChange={(event) =>
                          setDetails((d) => ({ ...d, organization: event.target.value }))
                        }
                        className={controlClasses}
                      />
                    )}
                  </Field>
                  <ChoiceGroup
                    legend="How should we reach you?"
                    name="preferredContact"
                    options={CONTACT_METHODS.map((m) => CONTACT_METHOD_LABELS[m])}
                    value={CONTACT_METHOD_LABELS[details.preferredContact]}
                    onChange={(label) => {
                      const found = CONTACT_METHODS.find(
                        (m) => CONTACT_METHOD_LABELS[m] === label,
                      );
                      if (found) setDetails((d) => ({ ...d, preferredContact: found }));
                    }}
                    error={errors.preferredContact}
                    columns={2}
                  />
                  <p className="text-muted text-sm">
                    Your contact details are not stored in this browser — they go straight
                    to us when you send.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {status.state === 'failed' ? (
            <p
              role="alert"
              className="border-status-down text-primary mt-8 border-l-2 pl-4 text-sm"
            >
              {status.message}
            </p>
          ) : null}

          <div className="border-line mt-10 flex flex-wrap items-center gap-3 border-t pt-6">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={() => goTo(step - 1)}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={sending}>
              {sending
                ? 'Sending…'
                : step === TOTAL_STEPS - 1
                  ? "Let's Solve It"
                  : 'Continue'}
            </Button>
            <span aria-live="polite" className="text-muted text-sm">
              {sending ? 'Sending your answers…' : ''}
            </span>
          </div>
        </form>
      </div>
    </Container>
  );
}
