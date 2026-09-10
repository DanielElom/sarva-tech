-- Sarva Tech — form submissions.
--
-- ONE table for both entry points. /start and /contact have the same lifecycle
-- (arrive, get read, get replied to) and the same handling rules, and the only
-- real difference is how much the person told us. Two tables would mean two
-- migrations, two policies, two queries and two places to forget something.
-- `kind` distinguishes them; the intake-only columns are nullable.
--
-- CLAUDE.md 9: this table is the source of truth. The notification email is a
-- convenience, and a lead must survive its failure.

create type public.submission_kind as enum ('intake', 'contact');

create type public.contact_method as enum ('email', 'phone', 'whatsapp');

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  kind public.submission_kind not null,

  -- Step 5 / contact form. Only name and email are required of everyone.
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(email) between 3 and 254 and position('@' in email) > 1),
  phone text check (phone is null or length(phone) <= 40),
  organization text check (organization is null or length(organization) <= 160),
  preferred_contact public.contact_method not null default 'email',

  -- The problem, in their words. /contact calls it a message.
  message text not null check (length(trim(message)) between 1 and 5000),

  -- Intake-only. Null for contact submissions, which is why they are nullable
  -- rather than defaulted: an absent answer and a chosen answer are different
  -- things and the table should not blur them.
  goal text check (goal is null or length(goal) <= 80),
  organization_type text check (organization_type is null or length(organization_type) <= 40),
  project_stage text check (project_stage is null or length(project_stage) <= 40),

  -- Operational, not personal. Kept for rate-limit forensics and triage.
  source_path text check (source_path is null or length(source_path) <= 200),
  user_agent text check (user_agent is null or length(user_agent) <= 400),

  -- Whether the notification email went out. False is not a failed submission,
  -- it is a submission whose email needs retrying — the distinction CLAUDE.md 9
  -- exists to protect.
  notified boolean not null default false,
  notify_error text
);

-- An intake submission answers the intake questions; a contact one does not.
alter table public.submissions
  add constraint submissions_intake_fields_present
  check (
    (kind = 'intake' and goal is not null and organization_type is not null and project_stage is not null)
    or
    (kind = 'contact' and goal is null and organization_type is null and project_stage is null)
  );

create index submissions_created_at_idx on public.submissions (created_at desc);
create index submissions_kind_created_at_idx on public.submissions (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- RLS is enabled and NO policies are created. That is deliberate and it is the
-- whole security model: with RLS on and no policy, every role that respects RLS
-- — anon and authenticated — is denied both read and write. The service role
-- bypasses RLS, so the server can insert.
--
-- The consequence to keep in mind: the anon key cannot read submissions even by
-- accident, and it cannot write them either, so nobody can stuff this table
-- from the browser. Every insert goes through the route handler, which is where
-- validation, the honeypot and the rate limit live.
alter table public.submissions enable row level security;

revoke all on public.submissions from anon, authenticated;

comment on table public.submissions is
  'Form submissions from /start (kind=intake) and /contact (kind=contact). RLS on with no policies: anon and authenticated are denied read and write; inserts happen server-side with the service role only. Source of truth for a lead — the notification email may fail without losing the row.';
