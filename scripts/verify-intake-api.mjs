/**
 * Contract tests for POST /api/intake.
 *
 * Everything here is checkable without a database: the honeypot, validation and
 * the rate limit all answer before Supabase is reached. The end-to-end path —
 * a row actually landing, and a lead surviving a broken Resend key — needs real
 * credentials and is exercised separately.
 *
 * Usage: node scripts/verify-intake-api.mjs http://localhost:3210
 */
const ORIGIN = process.argv[2] ?? 'http://localhost:3210';

let failures = 0;
function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
}

/** A distinct IP per case, so one case cannot rate-limit the next. */
function post(body, ip) {
  return fetch(`${ORIGIN}/api/intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const validContact = {
  kind: 'contact',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '',
  organization: '',
  message: 'We take orders on WhatsApp and copy them into a spreadsheet by hand.',
  preferredContact: 'email',
  website: '',
};

console.log('\nINTAKE API CONTRACT\n');

// -- Validation -------------------------------------------------------------
{
  const res = await post({ ...validContact, email: 'not-an-email', name: '' }, '10.0.0.1');
  const body = await res.json();
  check(
    'Invalid fields are rejected with per-field messages, before any storage call',
    res.status === 400 && body.ok === false && body.fieldErrors?.email && body.fieldErrors?.name,
    `HTTP ${res.status} — ${JSON.stringify(body.fieldErrors ?? {})}`,
  );
}

// -- Honeypot ---------------------------------------------------------------
{
  const res = await post({ ...validContact, website: 'http://spam.example' }, '10.0.0.2');
  const body = await res.json();
  check(
    'A filled honeypot is rejected',
    res.status === 400 && body.ok === false,
    `HTTP ${res.status} — ${body.error ?? ''}`,
  );
  check(
    'The honeypot rejection does not name the honeypot field',
    !JSON.stringify(body).toLowerCase().includes('honeypot') &&
      !JSON.stringify(body.fieldErrors ?? {}).includes('website'),
    `body mentions website=${JSON.stringify(body.fieldErrors ?? {}).includes('website')} — a bot should learn nothing`,
  );
}

// -- Method / payload guards -----------------------------------------------
{
  const res = await fetch(`${ORIGIN}/api/intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.3' },
    body: 'not json',
  });
  check('Unparseable bodies are refused', res.status === 400, `HTTP ${res.status}`);
}

// -- Rate limit -------------------------------------------------------------
{
  const ip = '10.0.0.99';
  const statuses = [];
  for (let i = 0; i < 7; i++) {
    const res = await post({ ...validContact, message: `Attempt ${i} of a burst of requests.` }, ip);
    statuses.push(res.status);
  }
  const limited = statuses.filter((s) => s === 429);
  const firstLimitedAt = statuses.indexOf(429);
  check(
    'A burst from one address is rate limited',
    limited.length > 0,
    `statuses ${statuses.join(', ')} — first 429 at request ${firstLimitedAt + 1}`,
  );

  const res = await post(validContact, ip);
  const retryAfter = res.headers.get('retry-after');
  const body = await res.json();
  check(
    'The limited response says how long to wait and offers another route',
    res.status === 429 && Number(retryAfter) > 0 && /whatsapp/i.test(body.error ?? ''),
    `HTTP ${res.status}, retry-after ${retryAfter}s — "${body.error ?? ''}"`,
  );

  const other = await post(validContact, '10.0.0.100');
  check(
    'The limit is per address, not global',
    other.status !== 429,
    `a different address got HTTP ${other.status}`,
  );
}

// -- Storage honesty --------------------------------------------------------
{
  const res = await post(validContact, '10.0.1.1');
  const body = await res.json();
  const configured = res.status === 201;
  if (configured) {
    check('A valid submission is stored and returns its id', body.ok === true && !!body.id, `id ${body.id}`);
  } else {
    check(
      'With storage unavailable the API refuses rather than reporting success',
      res.status === 503 && body.ok === false && !/sorry/i.test(body.error ?? ''),
      `HTTP ${res.status} — "${body.error ?? ''}"`,
    );
  }
}

console.log(`\n  ${failures === 0 ? 'API contract holds.' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
