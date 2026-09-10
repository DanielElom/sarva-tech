/**
 * Proves the service-role key never reaches the browser.
 *
 * The mechanism protecting it is `import 'server-only'` in lib/supabase-server.ts
 * plus the absence of a NEXT_PUBLIC_ prefix, but a mechanism you have not
 * watched fail is a mechanism you are trusting rather than testing. This builds
 * with a known sentinel value in SUPABASE_SERVICE_ROLE_KEY and greps every
 * emitted client asset for it.
 *
 * Also checks the real key from .env.local if one is present, so a live
 * configuration is covered as well as the synthetic one.
 *
 * Usage: node scripts/verify-secrets.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SENTINEL = 'sb_secret_SENTINEL_dc0ffee_must_never_reach_the_browser';

let failures = 0;
function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
}

/** Every file a browser could download. */
function clientAssets() {
  const roots = [join(root, '.next/static')];
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  roots.forEach(walk);
  // Server-rendered HTML is delivered to the browser too.
  const serverApp = join(root, '.next/server/app');
  const walkHtml = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkHtml(full);
      else if (/\.(html|rsc|json)$/.test(entry)) out.push(full);
    }
  };
  walkHtml(serverApp);
  return out;
}

function scan(needle, label) {
  const hits = [];
  for (const file of clientAssets()) {
    let text;
    try {
      text = readFileSync(file, 'utf-8');
    } catch {
      continue; // binary asset (font, image)
    }
    if (text.includes(needle)) hits.push(file.replace(root + '/', ''));
  }
  check(
    `${label} appears in no client asset`,
    hits.length === 0,
    hits.length ? `FOUND IN:\n          ${hits.join('\n          ')}` : `${clientAssets().length} assets scanned, 0 matches`,
  );
  return hits.length === 0;
}

console.log('\nSECRET CONTAINMENT\n');

// Build with a sentinel service-role key present in the environment.
const build = spawnSync('pnpm', ['exec', 'next', 'build'], {
  cwd: root,
  encoding: 'utf-8',
  env: {
    ...process.env,
    SUPABASE_SERVICE_ROLE_KEY: SENTINEL,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  },
});
check('Build succeeds with a service-role key in the environment', build.status === 0,
  build.status === 0 ? '' : (build.stdout ?? '').split('\n').slice(-8).join('\n          '));

if (build.status === 0) {
  scan(SENTINEL, 'The sentinel service-role key');

  // A negative control: if the scanner cannot find a string that IS in the
  // bundle, its silence about the key would mean nothing.
  const control = 'sarva';
  const assets = clientAssets();
  const controlFound = assets.some((f) => {
    try {
      return readFileSync(f, 'utf-8').includes(control);
    } catch {
      return false;
    }
  });
  check(
    'Control: the scanner does find a string that is genuinely in the bundle',
    controlFound,
    `searched for ${JSON.stringify(control)} across ${assets.length} assets`,
  );

  // If a real key is configured, check that too.
  const envLocal = join(root, '.env.local');
  if (existsSync(envLocal)) {
    const line = readFileSync(envLocal, 'utf-8')
      .split('\n')
      .find((l) => l.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY='));
    const realKey = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (realKey && realKey.length > 20) {
      scan(realKey, 'The real service-role key from .env.local');
    } else {
      console.log('  --    .env.local has no usable SUPABASE_SERVICE_ROLE_KEY to cross-check');
    }
  } else {
    console.log('  --    no .env.local present; sentinel check only');
  }
}

console.log(`\n  ${failures === 0 ? 'No secret reached a client asset.' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
