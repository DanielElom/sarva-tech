/**
 * The posted intake payload and the union the route handler parses.
 *
 * Apart from lib/schemas.ts for one measured reason: the browser never parses a
 * whole submission — it validates a step at a time and posts — so pulling
 * `discriminatedUnion` and the full intake schema into the client bundle bought
 * nothing on a route with no headroom. The field rules are still shared;
 * everything here is composed from the same definitions the browser uses.
 */
import { discriminatedUnion, enum as zEnum, literal, object, type infer as Infer } from 'zod/mini';
import { GOALS, ORGANIZATION_TYPES, PROJECT_STAGES } from './form-options';
import {
  contactSchema,
  emailField,
  honeypotField,
  messageField,
  nameField,
  organizationField,
  phoneField,
  preferredContactField,
} from './schemas';

/** The whole intake, as posted. */
export const intakeSchema = object({
  kind: literal('intake'),
  goal: zEnum(GOALS),
  message: messageField,
  organizationType: zEnum(ORGANIZATION_TYPES),
  projectStage: zEnum(PROJECT_STAGES),
  name: nameField,
  email: emailField,
  phone: phoneField,
  organization: organizationField,
  preferredContact: preferredContactField,
  website: honeypotField,
});

export const submissionSchema = discriminatedUnion('kind', [intakeSchema, contactSchema]);

export type IntakeInput = Infer<typeof intakeSchema>;
export type SubmissionInput = Infer<typeof submissionSchema>;
