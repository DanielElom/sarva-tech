/**
 * Measures the JavaScript each route actually ships, gzipped.
 *
 * CLAUDE.md 6 caps this at 200KB per route. Rather than trusting a build
 * summary, this asks the running production server for each route's HTML and
 * sums the gzipped size of every /_next/static/*.js it references — which is
 * what a visitor's browser will actually download.
 *
 * Usage: node scripts/bundle-sizes.mjs http://localhost:3000
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const origin = process.argv[2] ?? 'http://localhost:3000';
const LIMIT_KB = 200;

const routes = [
  '/',
  '/services',
  '/solutions',
  '/work',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/start',
  '/does-not-exist',
];

const cache = new Map();
function gzippedSize(assetPath) {
  if (cache.has(assetPath)) return cache.get(assetPath);
  const onDisk = join(process.cwd(), '.next', assetPath.replace(/^\/_next\//, ''));
  const size = existsSync(onDisk) ? gzipSync(readFileSync(onDisk)).length : 0;
  cache.set(assetPath, size);
  return size;
}

let failures = 0;
const rows = [];

for (const route of routes) {
  const response = await fetch(origin + route);
  const html = await response.text();
  const assets = [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)]+?\.js/g)].map((m) => m[0]))];
  const total = assets.reduce((sum, asset) => sum + gzippedSize(asset), 0);
  const kb = total / 1024;
  if (kb > LIMIT_KB) failures++;
  rows.push({
    route: route === '/does-not-exist' ? '/404' : route,
    status: response.status,
    chunks: assets.length,
    kb,
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n  Route                 Status  Chunks   JS gzipped   Limit ${LIMIT_KB}KB`);
console.log('  ' + '-'.repeat(62));
for (const row of rows) {
  console.log(
    `  ${pad(row.route, 20)}  ${pad(row.status, 6)}  ${pad(row.chunks, 6)}  ${(row.kb.toFixed(1) + ' KB').padStart(10)}   ${row.kb <= LIMIT_KB ? 'pass' : 'FAIL'}`,
  );
}
console.log(
  `\n  Largest initial payload: ${Math.max(...rows.map((r) => r.kb)).toFixed(1)} KB gzipped. ${failures === 0 ? 'All routes under the cap.' : `${failures} over.`}`,
);

/*
 * Deferred chunks (CLAUDE.md 6, ≤50KB per route). These are not in the served
 * HTML — they are fetched after paint — so they cannot be measured by reading
 * the markup. Drive a real browser and diff what it actually requested against
 * what the HTML referenced.
 */
const DEFERRED_LIMIT_KB = 50;
const chromePath =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const profile = mkdtempSync(join(tmpdir(), 'sarva-deferred-'));
// Ephemeral port, for the same reason as scripts/verify-ui.mjs: an orphaned
// Chrome holding a fixed port makes a later run drive the wrong browser.
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=0',
  '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profile}`,
  '--no-first-run',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let deferredFailures = 0;
try {
  let port = null;
  for (let i = 0; i < 60 && !port; i++) {
    await sleep(200);
    try {
      const line = readFileSync(join(profile, 'DevToolsActivePort'), 'utf-8').split('\n')[0];
      if (line?.trim()) port = Number(line.trim());
    } catch {
      /* not written yet */
    }
  }
  if (!port) throw new Error('Chrome never reported a debugging port.');

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('Chrome did not expose a debugging target.');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const fetched = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    } else if (msg.method === 'Network.responseReceived') {
      const { response, type } = msg.params;
      if (type === 'Script') fetched.push(response.url);
    }
  });
  const send = (method, params = {}) => {
    const i = ++id;
    ws.send(JSON.stringify({ id: i, method, params }));
    return new Promise((r) => pending.set(i, r));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('\n  Deferred chunks fetched after paint (desktop, motion allowed)');
  console.log('  ' + '-'.repeat(62));

  for (const route of ['/']) {
    fetched.length = 0;
    await send('Page.navigate', { url: origin + route });
    // Wait until the hero visual has actually mounted, then a moment more.
    for (let i = 0; i < 60; i++) {
      await sleep(200);
      const r = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('[data-hero-canvas]')`,
        returnByValue: true,
      });
      if (r?.result?.value) break;
    }
    await sleep(600);

    const html = await (await fetch(origin + route)).text();
    const inHtml = new Set(
      [...html.matchAll(/\/_next\/static\/[^"'\s)]+?\.js/g)].map((m) => m[0]),
    );
    const deferred = [...new Set(fetched)]
      .map((url) => new URL(url).pathname)
      .filter((path) => path.startsWith('/_next/static/') && !inHtml.has(path));

    const total = deferred.reduce((sum, path) => sum + gzippedSize(path), 0) / 1024;
    if (total > DEFERRED_LIMIT_KB) deferredFailures++;
    console.log(
      `  ${route.padEnd(20)}  ${deferred.length} chunk(s)  ${(total.toFixed(1) + ' KB').padStart(10)}   ${total <= DEFERRED_LIMIT_KB ? 'pass' : 'FAIL'}  (limit ${DEFERRED_LIMIT_KB}KB)`,
    );
    for (const path of deferred) {
      console.log(`      ${(gzippedSize(path) / 1024).toFixed(1).padStart(6)} KB  ${path}`);
    }
  }

  ws.close();
} finally {
  chrome.kill();
}

console.log('');
process.exit(failures === 0 && deferredFailures === 0 ? 0 : 1);
