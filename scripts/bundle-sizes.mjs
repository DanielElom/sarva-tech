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
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
  `\n  Largest route: ${Math.max(...rows.map((r) => r.kb)).toFixed(1)} KB gzipped. ${failures === 0 ? 'All routes under the cap.' : `${failures} over.`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
