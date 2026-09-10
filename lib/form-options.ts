/**
 * The choices a form offers, and the shape the API answers with.
 *
 * Deliberately free of zod. The components need these at first paint to render
 * the radio groups; they do NOT need the validators until someone submits a
 * step. Keeping the two apart is what lets lib/schemas.ts be loaded on demand
 * instead of blocking the initial payload — see the note there.
 */
export const GOALS = [
  'Build a new product',
  'Improve an existing product',
  'Fix a technical problem',
  'Automate a process',
  'Build a website',
  'Build a mobile application',
  'Build a SaaS product',
  'Need technical talent',
  'Something else',
] as const;

export const ORGANIZATION_TYPES = [
  'Startup',
  'SME',
  'Enterprise',
  'Institution',
  'Individual',
  'Other',
] as const;

export const PROJECT_STAGES = [
  'Idea',
  'Planning',
  'Existing product',
  'Scaling',
  'Broken, needs rescue',
] as const;

export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;

export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
};

/** Shape the API returns. Narrow on purpose — the client shows what it is told. */
export type SubmissionResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
