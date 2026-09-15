/**
 * Reports the LCP a browser actually records, as opposed to the one Lighthouse
 * estimates.
 *
 * Why this exists. S8 was opened to fix a homepage LCP of 2.76s. That number is
 * produced by Lighthouse's DEFAULT throttling method, "simulate" (Lantern),
 * which does not measure LCP — it loads the page unthrottled and then models
 * what the timings would have been on a slow connection. On this site the model
 * and the browser disagree enormously: in the very same run that reported
 * 2.72s, Lighthouse's own trace observed 0.71s. Blocking every script changed
 * the reported figure by 0.01s, which is the proof that no amount of
 * application work moves it.
 *
 * So before optimising against a Lighthouse number, check it against this. If
 * the browser already paints the element on time, the work to do is somewhere
 * other than where the report is pointing.
 *
 * This drives a real Chrome over CDP with 4x CPU throttling — a mid-range
 * Android, per CLAUDE.md 6 — and reads the largest-contentful-paint entries the
 * browser itself emits, including every candidate, so a late re-paint would be
 * visible rather than averaged away.
 *
 * Usage: node scripts/observed-lcp.mjs https://sarva-tech.vercel.app / /privacy
 */
import { spawn } from 'node:child_process';
import { createGuardedProfile } from './profile-guard.mjs';

const ORIGIN = process.argv[2] ?? 'http://localhost:3311';
const ROUTES = process.argv.length > 3 ? process.argv.slice(3) : ['/'];
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** CLAUDE.md 6: the target device is a mid-range Android, not this laptop. */
const CPU_THROTTLE = 4;
/**
 * CLAUDE.md 6's ceiling. Overridable so the check can be demonstrated failing —
 * a threshold nobody has ever seen trip is a threshold nobody knows is wired up.
 */
const CEILING_MS = Number(process.env.LCP_CEILING_MS ?? 2500);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const guard = createGuardedProfile('sarva-observed-lcp-');
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${guard.profile}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

let wsUrl = null;
chrome.stderr.on('data', (chunk) => {
  const match = String(chunk).match(/ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[\w-]+/);
  if (match) wsUrl = match[0].replace('/devtools/browser/', '/json/version#');
});

const results = [];
let socket;
try {
  for (let i = 0; i < 100 && !wsUrl; i++) await wait(100);
  if (!wsUrl) throw new Error('Chrome did not report a DevTools endpoint.');

  const port = wsUrl.match(/127\.0\.0\.1:(\d+)/)[1];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve));

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 823,
    deviceScaleFactor: 1.75,
    mobile: true,
  });

  for (const route of ROUTES) {
    await send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
    await send('Page.navigate', { url: 'about:blank' });
    await wait(300);
    // Installed before navigation so `buffered: true` cannot miss the first
    // entry — an observer registered after paint sees nothing and reports a
    // healthy page as having no LCP at all.
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__lcp = [];
        window.__fcp = null;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__lcp.push({
              t: entry.startTime,
              size: entry.size,
              tag: entry.element ? entry.element.tagName : '?',
              text: (entry.element ? entry.element.textContent : '').slice(0, 44),
            });
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') window.__fcp = entry.startTime;
          }
        }).observe({ type: 'paint', buffered: true });
      `,
    });
    await send('Page.navigate', { url: ORIGIN + route });
    await wait(9000);
    const evaluated = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ fcp: window.__fcp, lcp: window.__lcp })',
      returnByValue: true,
    });
    const { fcp, lcp } = JSON.parse(evaluated.result.value);
    const final = lcp.length ? lcp[lcp.length - 1].t : null;
    results.push({ route, fcp, final, candidates: lcp });

    console.log(`\n  ${ORIGIN}${route}   (${CPU_THROTTLE}x CPU)`);
    console.log(`    FCP ${fcp === null ? 'none' : Math.round(fcp) + 'ms'}`);
    for (const [index, c] of lcp.entries()) {
      console.log(
        `    candidate ${index + 1}: ${Math.round(c.t)}ms  ${c.size}px²  <${c.tag}> "${c.text.trim()}"`,
      );
    }
    console.log(`    OBSERVED LCP ${final === null ? 'none' : Math.round(final) + 'ms'}`);
    if (final !== null && fcp !== null) {
      const delta = Math.round(final - fcp);
      console.log(
        `    ${delta <= 1 ? 'Paints once, at first paint.' : `Re-painted ${delta}ms after FCP — that gap is real work.`}`,
      );
    }
  }
} finally {
  try {
    socket?.close();
  } catch {
    /* already closed */
  }
  await guard.release(chrome);
}

const over = results.filter((r) => r.final === null || r.final > CEILING_MS);
console.log(
  `\n  ${results.length} route(s), ceiling ${CEILING_MS}ms. ` +
    (over.length === 0
      ? 'All observed LCP under the ceiling.'
      : 'OVER CEILING: ' +
        over
          .map((r) => `${r.route} ${r.final === null ? 'no LCP recorded' : Math.round(r.final) + 'ms'}`)
          .join(', ')) +
    '\n',
);
process.exit(over.length === 0 ? 0 : 1);
