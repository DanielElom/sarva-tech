/**
 * Zod schemas shared between the browser and the route handler (CLAUDE.md 9).
 *
 * Shared means the same file, not the same shape copied twice. The client uses
 * these to tell someone about a problem while they can still see the field; the
 * server re-runs the identical rules and trusts nothing that arrives. A client
 * that skips validation entirely still cannot get a bad row in.
 *
 * Built on `zod/mini` rather than the full build. Same library, same checks,
 * same messages — a tree-shakeable API instead of a chained one. The full build
 * put 90KB gzipped into /start and /contact on its own and took both routes 37%
 * over the payload cap. Nothing is validated less, on either side; see the S5
 * report for the measured before and after.
 *
 * This module is loaded ON DEMAND by the browser, not at first paint. Nothing
 * here is needed until someone submits a step, and CLAUDE.md 6 budgets initial
 * and deferred payloads separately for exactly this reason. The choices the
 * forms render live in lib/form-options.ts, which carries no zod at all.
 */
import {
  array,
  number,
  url,
  email as zEmail,
  enum as zEnum,
  literal,
  maxLength,
  minLength,
  object,
  optional,
  string,
  trim,
  type infer as Infer,
} from 'zod/mini';
import { CONTACT_METHODS, GOALS, ORGANIZATION_TYPES, PROJECT_STAGES } from './form-options';

/*
 * Field rules, defined once and composed by both the per-step schemas here and
 * the posted-payload schemas in schemas.server.ts.
 *
 * Messages are written for the person who tripped them: what is wrong and what
 * to do about it. CLAUDE.md 10 — errors do not apologise and are never vague.
 */
export const nameField = string().check(
  trim(),
  minLength(1, 'Tell us what to call you.'),
  maxLength(120, 'That is longer than 120 characters. Shorten it.'),
);

export const emailField = string().check(
  trim(),
  minLength(1, 'We need an email address to reply to.'),
  maxLength(254, 'That is longer than an email address can be.'),
  zEmail('That does not look like an email address. Check for a typo.'),
);

export const phoneField = optional(
  string().check(trim(), maxLength(40, 'That is longer than 40 characters.')),
);

export const organizationField = optional(
  string().check(trim(), maxLength(160, 'That is longer than 160 characters.')),
);

export const preferredContactField = zEnum(CONTACT_METHODS);

/** The honeypot. A real person never sees this field, so anything in it is a bot. */
export const honeypotField = literal('', { error: 'This submission looks automated.' });

export const messageField = string().check(
  trim(),
  minLength(
    20,
    'A sentence or two, at least — enough for us to know what you are dealing with.',
  ),
  maxLength(5000, 'That is longer than 5000 characters. Trim it.'),
);

/** Step 5 of the intake, and most of the contact form. */
export const contactDetailsSchema = object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  organization: organizationField,
  preferredContact: preferredContactField,
});

/** One schema per step, so a problem is reported while the field is on screen. */
export const intakeStepSchemas = [
  object({ goal: zEnum(GOALS, { error: 'Pick the closest one.' }) }),
  object({ message: messageField }),
  object({
    organizationType: zEnum(ORGANIZATION_TYPES, { error: 'Pick the closest one.' }),
  }),
  object({ projectStage: zEnum(PROJECT_STAGES, { error: 'Pick the closest one.' }) }),
  contactDetailsSchema,
] as const;

/**
 * The contact form, as posted. It lives here rather than in schemas.server
 * because the browser validates the whole thing in one go — there are no steps.
 */
export const contactSchema = object({
  kind: literal('contact'),
  message: string().check(
    trim(),
    minLength(10, 'A sentence is enough, but we need something to go on.'),
    maxLength(5000, 'That is longer than 5000 characters. Trim it.'),
  ),
  name: nameField,
  email: emailField,
  phone: phoneField,
  organization: organizationField,
  preferredContact: preferredContactField,
  website: honeypotField,
});

/*
 * Solution frontmatter. Parsed and validated at BUILD time — see lib/solutions.ts
 * — so this never reaches a browser at all, which is the strongest form of the
 * load-on-demand rule in CLAUDE.md 6.
 */
export const solutionFrontmatterSchema = object({
  name: string().check(trim(), minLength(1, 'name is required')),
  tagline: string().check(trim(), minLength(1, 'tagline is required')),
  problem: string().check(trim(), minLength(40, 'problem must say what is actually wrong')),
  description: string().check(
    trim(),
    minLength(40, 'description must say what the product does'),
  ),
  technologies: array(string().check(trim(), minLength(1))).check(
    minLength(1, 'list at least one technology'),
  ),
  capabilities: optional(array(string().check(trim(), minLength(1)))),
  status: string().check(trim(), minLength(1, 'status is required')),
  order: number(),
  /*
   * Optional on purpose. Domains are not live yet, and an entry has to render
   * complete without one — the link simply appears when a value is added, with
   * no component change. An empty string is rejected rather than quietly
   * rendering a link to nowhere.
   */
  publicUrl: optional(
    string().check(
      trim(),
      minLength(1, 'publicUrl must be a URL or absent, never empty'),
      url('publicUrl must be a full URL'),
    ),
  ),
});

export type SolutionFrontmatter = Infer<typeof solutionFrontmatterSchema>;

export type ContactInput = Infer<typeof contactSchema>;
export type ContactDetails = Infer<typeof contactDetailsSchema>;
