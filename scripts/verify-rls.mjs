/**
 * Proves the anon key can neither read nor write submissions.
 *
 * The submissions table has RLS enabled and no policies, so every role that
 * respects RLS is denied. That is the entire security model, and a model you
 * have not watched refuse something is one you are assuming. This asks the real
 * PostgREST endpoint with the real anon key and shows what comes back.
 *
 * The service-role check at the end is the control: if it also failed, the anon
 * failures above would prove nothing about RLS — only that the table was
 * missing or the URL wrong.
 *
 * Usage: node scripts/verify-rls.mjs
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
}

async function call(key, method, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/submissions${method === 'GET' ? '?select=*' : ''}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, text };
}

console.log('\nROW LEVEL SECURITY\n');

// -- anon READ --------------------------------------------------------------
{
  const { status, text } = await call(ANON, 'GET');
  let rows = null;
  try {
    rows = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  const denied = status === 401 || status === 403 || (Array.isArray(rows) && rows.length === 0);
  check(
    'anon key CANNOT read submissions',
    denied && !(Array.isArray(rows) && rows.length > 0),
    `HTTP ${status} — ${text.slice(0, 220)}`,
  );
}

// -- anon WRITE -------------------------------------------------------------
{
  const { status, text } = await call(ANON, 'POST', {
    kind: 'contact',
    name: 'RLS Probe',
    email: 'rls-probe@example.com',
    message: 'This insert must be refused by row level security.',
    preferred_contact: 'email',
  });
  check(
    'anon key CANNOT write submissions',
    status === 401 || status === 403,
    `HTTP ${status} — ${text.slice(0, 220)}`,
  );
}

// -- service role control ---------------------------------------------------
{
  const { status, text } = await call(SERVICE, 'GET');
  let rows = null;
  try {
    rows = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  check(
    'Control: the service role CAN read, so the denials above are RLS and not a broken URL',
    status === 200 && Array.isArray(rows),
    `HTTP ${status}, ${Array.isArray(rows) ? rows.length : '?'} row(s) visible to the service role`,
  );
}

console.log(`\n  ${failures === 0 ? 'RLS holds: anon is denied both ways.' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
