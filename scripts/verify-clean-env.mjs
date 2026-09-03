/**
 * Builds the way CI builds: no .env.local, and none of the variables a local
 * machine happens to have exported.
 *
 * This exists because of a specific failure. `SITE.url` fell back with `??`,
 * which does not catch an empty string, and Next inlines an unset
 * NEXT_PUBLIC_* variable AS an empty string. Every local build passed because
 * .env-supplied values masked it; the Vercel build died in `new URL('')`.
 * A build that only ever runs with the developer's environment cannot catch
 * that class of bug, so this one deliberately takes the environment away.
 *
 * Two parts:
 *   1. the resolver's contract, asserted directly over every branch;
 *   2. a real `next build` with .env.local moved aside and the relevant
 *      variables stripped from the environment.
 *
 * Usage: node --experimental-strip-types scripts/verify-clean-env.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveSiteUrl, SiteUrlError } from '../lib/site.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
}

function resolves(env, expected, label) {
  let actual;
  try {
    actual = resolveSiteUrl(env);
  } catch (error) {
    actual = `threw ${error.name}`;
  }
  check(label, actual === expected, `-> ${actual}`);
}

console.log('\nSITE URL RESOLUTION\n');

// The four documented cases, in priority order.
resolves(
  { NEXT_PUBLIC_SITE_URL: 'https://sarva.tech', VERCEL_URL: 'ignored.vercel.app' },
  'https://sarva.tech',
  '1. explicit NEXT_PUBLIC_SITE_URL wins over everything',
);
resolves(
  { VERCEL_PROJECT_PRODUCTION_URL: 'sarva-tech.vercel.app', VERCEL_URL: 'preview.vercel.app' },
  'https://sarva-tech.vercel.app',
  '2. VERCEL_PROJECT_PRODUCTION_URL, scheme prepended, wins over VERCEL_URL',
);
resolves(
  { VERCEL_URL: 'sarva-tech-git-main.vercel.app' },
  'https://sarva-tech-git-main.vercel.app',
  '3. VERCEL_URL for preview deploys, scheme prepended',
);
resolves({}, 'http://localhost:3000', '4. nothing set falls back to localhost');

console.log('\nEMPTY AND MALFORMED VALUES\n');

// The exact shape of the Vercel failure: set, but empty.
resolves(
  { NEXT_PUBLIC_SITE_URL: '' },
  'http://localhost:3000',
  'An empty NEXT_PUBLIC_SITE_URL falls through instead of reaching new URL()',
);
resolves(
  { NEXT_PUBLIC_SITE_URL: '   ' },
  'http://localhost:3000',
  'A whitespace-only value falls through',
);
resolves(
  { VERCEL_URL: '', VERCEL_PROJECT_PRODUCTION_URL: '' },
  'http://localhost:3000',
  'Empty Vercel variables fall through',
);
resolves(
  { NEXT_PUBLIC_SITE_URL: 'https://sarva.tech/' },
  'https://sarva.tech',
  'A trailing slash is normalised away',
);
resolves(
  { NEXT_PUBLIC_SITE_URL: 'sarva.tech' },
  'https://sarva.tech',
  'A bare host gains https://',
);

// Malformed values must fail loudly and by name.
for (const [label, value] of [
  ['a value with a space', 'https://sarva tech'],
  ['a non-http scheme', 'ftp://sarva.tech'],
]) {
  let name = 'did not throw';
  let message = '';
  try {
    resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: value });
  } catch (error) {
    name = error.name;
    message = error.message;
  }
  check(
    `${label} throws a named SiteUrlError`,
    name === 'SiteUrlError' && message.includes('NEXT_PUBLIC_SITE_URL'),
    `${name}: ${message.slice(0, 110)}`,
  );
}

check(
  'SiteUrlError is exported and is an Error',
  new SiteUrlError('x') instanceof Error && new SiteUrlError('x').name === 'SiteUrlError',
);

// -- The real build, with the environment taken away ------------------------
console.log('\nCLEAN-ENVIRONMENT BUILD\n');

// Anything Next would read from disk. Moved aside, restored no matter what.
const localEnvFiles = [
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
];
const moved = [];

function restore() {
  while (moved.length) {
    const [from, to] = moved.pop();
    if (existsSync(from)) renameSync(from, to);
  }
}

// Restore even on Ctrl-C, so an interrupted run never leaves a developer
// wondering where their .env.local went.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restore();
    process.exit(130);
  });
}

try {
  for (const name of localEnvFiles) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const aside = `${path}.verify-backup`;
    renameSync(path, aside);
    moved.push([aside, path]);
    console.log(`  moved ${name} aside for the duration of this build`);
  }
  if (moved.length === 0) console.log('  no local env files present');

  // A CI-like environment: strip anything that could supply the site URL, plus
  // the Vercel variables, so the fallback chain is genuinely exercised.
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('VERCEL_')) delete env[key];
  }

  const build = (label, overrides) => {
    const result = spawnSync('pnpm', ['exec', 'next', 'build'], {
      cwd: root,
      env: { ...env, ...overrides },
      encoding: 'utf-8',
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    const ok = result.status === 0;
    check(
      label,
      ok && !/ERR_INVALID_URL/.test(output),
      ok
        ? 'built clean'
        : output
            .split('\n')
            .filter((line) => /error|Error|invalid|Invalid|ERR_/.test(line))
            .slice(0, 6)
            .join('\n          '),
    );
  };

  // Variables absent entirely.
  build('next build succeeds with no .env.local and no NEXT_PUBLIC_/VERCEL_ variables', {});

  /*
   * The one that matters. Stripping the variables is NOT enough to catch the
   * original bug: unset means `undefined`, and the old `??` fallback handled
   * that correctly, which is why every local build passed. The failure needed
   * the variable to be PRESENT AND EMPTY — the shape Next produces when it
   * inlines an unset NEXT_PUBLIC_* value. That is the regression test.
   */
  build('next build survives NEXT_PUBLIC_SITE_URL being set but empty', {
    NEXT_PUBLIC_SITE_URL: '',
  });
  build('next build survives empty Vercel host variables', {
    VERCEL_PROJECT_PRODUCTION_URL: '',
    VERCEL_URL: '',
  });
} finally {
  restore();
}

console.log(
  `\n  ${failures === 0 ? 'Clean-environment checks passed.' : `${failures} FAILURE(S)`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
