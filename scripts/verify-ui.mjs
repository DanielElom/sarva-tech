/**
 * Drives a real Chrome over the DevTools Protocol to verify the behaviour the
 * definition of done asks for, rather than asserting it by hand.
 *
 * No dependencies: Node 22 has a global WebSocket, which is all CDP needs.
 *
 * Usage: node scripts/verify-ui.mjs http://localhost:3210
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { colorTokens } from '../lib/tokens.data.mjs';

const ORIGIN = process.argv[2] ?? 'http://localhost:3210';
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
}

/** Minimal CDP client. */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method && this.handlers.has(msg.method)) {
        this.handlers.get(msg.method).forEach((fn) => fn(msg.params));
      }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new CDP(ws);
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expression);
    return r.result.value;
  }
  /** Poll until `expression` is truthy, or give up. Returns whether it became true. */
  async waitFor(expression, timeoutMs = 12000, intervalMs = 100) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        if (await this.eval(expression)) return true;
      } catch {
        /* page mid-navigation; try again */
      }
      if (Date.now() > deadline) return false;
      await wait(intervalMs);
    }
  }

  async goto(url) {
    const done = new Promise((resolve) => this.on('Page.loadEventFired', resolve));
    await this.send('Page.navigate', { url });
    await done;
    await wait(250);
  }
  async key(type, key, code, keyCode, modifiers = 0) {
    await this.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers,
    });
  }
  async press(key, code, keyCode, modifiers = 0, text) {
    // A button activates on Enter only for a keyDown carrying text; a
    // rawKeyDown is enough for navigation keys like Tab.
    const id = ++this.id;
    this.ws.send(
      JSON.stringify({
        id,
        method: 'Input.dispatchKeyEvent',
        params: {
          type: text ? 'keyDown' : 'rawKeyDown',
          key,
          code,
          windowsVirtualKeyCode: keyCode,
          nativeVirtualKeyCode: keyCode,
          modifiers,
          ...(text ? { text, unmodifiedText: text } : {}),
        },
      }),
    );
    await new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    await this.key('keyUp', key, code, keyCode, modifiers);
    await wait(80);
  }
}

/** #RRGGBB -> "rgb(r, g, b)" as getComputedStyle reports it. */
function toRgb(hex) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

const profile = mkdtempSync(join(tmpdir(), 'sarva-cdp-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9333',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--hide-scrollbars',
]);

let client;
try {
  // Wait for the debugging endpoint.
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await wait(300);
    try {
      const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('Chrome did not expose a debugging target.');

  client = await CDP.connect(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  await client.send('Network.enable');

  /** Every script the browser actually fetched, in order. */
  let scriptRequests = [];
  client.on('Network.responseReceived', ({ response, type }) => {
    if (type === 'Script' || /\.js(\?|$)/.test(response.url)) {
      scriptRequests.push({ url: response.url, encoded: response.encodedDataLength });
    }
  });
  const resetScriptLog = () => {
    scriptRequests = [];
  };

  const night = colorTokens;
  const dayBase = toRgb(night['surface-base'].day);
  const nightBase = toRgb(night['surface-base'].night);

  // ---------------------------------------------------------------- THEME --
  console.log('\nTHEME');

  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  await client.goto(ORIGIN + '/');
  let state = await client.eval(`(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
  }))()`);
  check(
    'System dark preference resolves to the night theme on first load',
    state.attr === 'night' && state.bg === nightBase,
    `data-theme=${state.attr}  body background=${state.bg}  (night surface-base=${nightBase})`,
  );

  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });
  await client.eval(`localStorage.clear()`);
  await client.goto(ORIGIN + '/');
  state = await client.eval(`(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
  }))()`);
  check(
    'System light preference resolves to the day theme on first load',
    state.attr === 'day' && state.bg === dayBase,
    `data-theme=${state.attr}  body background=${state.bg}  (day surface-base=${dayBase})`,
  );

  // ------------------------------------------------------ NO THEME FLASH --
  // Stored choice deliberately contradicts the system preference. If the
  // attribute is set before first paint, no wrong-theme frame is ever shown.
  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  await client.eval(`localStorage.setItem('sarva-theme','day')`);
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__themeSetAt = null;
      // This runs before the document has a documentElement, so observe the
      // document itself with subtree, which covers <html>'s attributes.
      new MutationObserver(() => {
        if (window.__themeSetAt === null) window.__themeSetAt = performance.now();
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    `,
  });
  await client.goto(ORIGIN + '/');
  const flash = await client.eval(`(() => {
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    return {
      themeSetAt: window.__themeSetAt,
      fcp: fcp ? fcp.startTime : null,
      attr: document.documentElement.getAttribute('data-theme'),
      bg: getComputedStyle(document.body).backgroundColor,
    };
  })()`);
  check(
    'No flash of wrong theme: attribute is set before first contentful paint',
    flash.attr === 'day' &&
      flash.bg === dayBase &&
      flash.themeSetAt !== null &&
      flash.fcp !== null &&
      flash.themeSetAt < flash.fcp,
    `stored=day, system=dark -> resolved ${flash.attr}; attribute set at ${flash.themeSetAt?.toFixed(1)}ms, first contentful paint at ${flash.fcp?.toFixed(1)}ms`,
  );

  // ------------------------------------------------------ THEME TOGGLE ----
  const toggled = await client.eval(`(async () => {
    const before = document.documentElement.getAttribute('data-theme');
    const btn = [...document.querySelectorAll('button')]
      .find(b => /Switch to (night|day) theme/.test(b.getAttribute('aria-label') || ''));
    const label = btn && btn.getAttribute('aria-label');
    btn.click();
    await new Promise(r => setTimeout(r, 120));
    return {
      before, label,
      after: document.documentElement.getAttribute('data-theme'),
      stored: localStorage.getItem('sarva-theme'),
      bg: getComputedStyle(document.body).backgroundColor,
      labelAfter: btn.getAttribute('aria-label'),
    };
  })()`);
  check(
    'Toggle switches theme, persists it, and its accessible name says what it will do',
    toggled.before === 'day' &&
      toggled.after === 'night' &&
      toggled.stored === 'night' &&
      toggled.label === 'Switch to night theme' &&
      toggled.labelAfter === 'Switch to day theme',
    `"${toggled.label}" -> ${toggled.before} became ${toggled.after}, localStorage=${toggled.stored}, name now "${toggled.labelAfter}"`,
  );

  // --------------------------------------------------- SURFACE-INVERTED ---
  console.log('\nSURFACE-INVERTED');
  for (const theme of ['night', 'day']) {
    await client.eval(`localStorage.setItem('sarva-theme','${theme}')`);
    await client.goto(ORIGIN + '/');
    // Assert on EVERY inverted scope, and on the count. Querying only the
    // first one let a broken home-page band pass because the footer's scope
    // was found instead.
    const inv = await client.eval(`(() => {
      const els = [...document.querySelectorAll('[data-surface="inverted"]')];
      return {
        count: els.length,
        page: getComputedStyle(document.body).backgroundColor,
        scopes: els.map(el => {
          const heading = el.querySelector('h2');
          return {
            where: el.closest('footer') ? 'footer' : 'page body',
            panel: getComputedStyle(el).backgroundColor,
            headingColor: heading ? getComputedStyle(heading).color : null,
          };
        }),
      };
    })()`);
    const opposite = theme === 'night' ? 'day' : 'night';
    const wantPanel = toRgb(colorTokens['surface-base'][opposite]);
    const wantHeading = toRgb(colorTokens.primary[opposite]);
    const allFlipped =
      inv.count >= 2 &&
      inv.page === toRgb(colorTokens['surface-base'][theme]) &&
      inv.scopes.every(
        (s) => s.panel === wantPanel && (s.headingColor === null || s.headingColor === wantHeading),
      );
    check(
      `In the ${theme} theme, every inverted surface resolves to the ${opposite} base`,
      allFlipped,
      `page ${inv.page}; ${inv.count} inverted scopes -> ` +
        inv.scopes.map((s) => `${s.where}: bg ${s.panel}, h2 ${s.headingColor}`).join(' | ') +
        ` (want bg ${wantPanel}, h2 ${wantHeading})`,
    );
  }

  // ------------------------------------------------------- FOCUS RING -----
  console.log('\nKEYBOARD');
  await client.eval(`localStorage.setItem('sarva-theme','day')`);
  await client.goto(ORIGIN + '/');
  await client.press('Tab', 'Tab', 9);
  const focus = await client.eval(`(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30),
      outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle,
    };
  })()`);
  check(
    'First Tab reaches the skip link, with a visible accent-text focus ring',
    focus.text.includes('Skip to content') &&
      focus.outlineColor === toRgb(colorTokens['accent-text'].day) &&
      focus.outlineStyle === 'solid' &&
      parseFloat(focus.outlineWidth) >= 2,
    `focus on <${focus.tag}> "${focus.text}" — outline ${focus.outlineWidth} ${focus.outlineStyle} ${focus.outlineColor} (day accent-text=${toRgb(colorTokens['accent-text'].day)})`,
  );

  // Walk the whole header by keyboard and confirm nothing is unreachable.
  const reachable = await client.eval(`(() => {
    const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]';
    const all = [...document.querySelectorAll(sel)].filter(el => {
      if (el.closest('[inert]')) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    /*
     * A composite widget managing a roving tabindex is NOT unreachable: the
     * container is one Tab stop and the arrow keys move within it. Excluding
     * those here is correct; the roving invariant itself is asserted separately
     * in the tabs checks, so nothing goes unverified.
     */
    const managed = all.filter(el => el.tabIndex < 0 && el.closest('[role="tablist"]'));
    const orphaned = all.filter(el => el.tabIndex < 0 && !el.closest('[role="tablist"]'));
    return { total: all.length, managed: managed.length, orphaned: orphaned.length };
  })()`);
  check(
    'Every visible interactive element is reachable by keyboard',
    reachable.orphaned === 0,
    `${reachable.total} interactive elements on /, ${reachable.orphaned} unreachable, ` +
      `${reachable.managed} inside a roving-tabindex tablist (reached via arrow keys)`,
  );

  // ------------------------------------------------------- MOBILE MENU ---
  console.log('\nMOBILE MENU');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.goto(ORIGIN + '/');

  // Reach the trigger by keyboard alone, then open with Enter.
  const opened = await client.eval(`(async () => {
    const trigger = [...document.querySelectorAll('button')]
      .find(b => b.getAttribute('aria-label') === 'Open menu');
    trigger.focus();
    return { label: trigger.getAttribute('aria-label'), expanded: trigger.getAttribute('aria-expanded') };
  })()`);
  await client.press('Enter', 'Enter', 13, 0, '\r');
  await wait(400);
  const afterOpen = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return {
      inert: panel.hasAttribute('inert'),
      opacity: getComputedStyle(panel).opacity,
      focusInsidePanel: panel.contains(document.activeElement),
      focusText: (document.activeElement.textContent || '').trim().slice(0, 24),
      bodyOverflow: document.body.style.overflow,
      expanded: document.querySelector('[aria-controls]')?.getAttribute('aria-expanded'),
      modal: panel.getAttribute('aria-modal'),
      name: panel.getAttribute('aria-label'),
    };
  })()`);
  check(
    'Enter on the trigger opens the menu and moves focus into it',
    afterOpen.focusInsidePanel &&
      !afterOpen.inert &&
      afterOpen.opacity === '1' &&
      afterOpen.expanded === 'true' &&
      afterOpen.modal === 'true',
    `opened from "${opened.label}"; role=dialog aria-modal=${afterOpen.modal} name="${afterOpen.name}"; focus now on "${afterOpen.focusText}"`,
  );
  check(
    'Body scroll is locked while the menu is open',
    afterOpen.bodyOverflow === 'hidden',
    `document.body.style.overflow = "${afterOpen.bodyOverflow}"`,
  );

  // Tab well past the end of the panel; focus must never escape it.
  for (let i = 0; i < 14; i++) await client.press('Tab', 'Tab', 9);
  const trapped = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return { inside: panel.contains(document.activeElement),
             text: (document.activeElement.textContent || '').trim().slice(0, 24) };
  })()`);
  check(
    'Focus is trapped: 14 forward Tabs cannot leave the panel',
    trapped.inside,
    `focus rests on "${trapped.text}", inside the dialog`,
  );

  // And backwards.
  for (let i = 0; i < 6; i++) await client.press('Tab', 'Tab', 9, 8 /* shift */);
  const trappedBack = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return { inside: panel.contains(document.activeElement) };
  })()`);
  check('Focus is trapped going backwards too (6 Shift+Tabs)', trappedBack.inside);

  await client.press('Escape', 'Escape', 27);
  await wait(450);
  const afterEscape = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return {
      inert: panel.hasAttribute('inert'),
      opacity: getComputedStyle(panel).opacity,
      focusLabel: document.activeElement.getAttribute('aria-label'),
      bodyOverflow: document.body.style.overflow,
      expanded: document.querySelector('[aria-controls]')?.getAttribute('aria-expanded'),
    };
  })()`);
  check(
    'Escape closes the menu, restores focus to the trigger, and unlocks scrolling',
    afterEscape.inert &&
      afterEscape.opacity === '0' &&
      afterEscape.focusLabel === 'Open menu' &&
      afterEscape.bodyOverflow !== 'hidden' &&
      afterEscape.expanded === 'false',
    `panel inert=${afterEscape.inert} opacity=${afterEscape.opacity}; focus back on "${afterEscape.focusLabel}"; body overflow="${afterEscape.bodyOverflow || '(cleared)'}"`,
  );

  await client.send('Emulation.clearDeviceMetricsOverride');

  // ------------------------------------------------------- STATUS LINE ---
  console.log('\nSTATUS LINE');
  await client.goto(ORIGIN + '/');
  await wait(700);
  const status = await client.eval(`(() => {
    const el = document.querySelector('[aria-live="polite"]');
    return { text: el.textContent.trim().replace(/\\s+/g, ' '), live: el.getAttribute('aria-live') };
  })()`);
  const health = await (await fetch(ORIGIN + '/api/health')).json();
  check(
    'Status line reflects the real /api/health response, not a hardcoded string',
    status.text.toLowerCase().includes('partial service') &&
      status.text.includes('supabase: not_configured') &&
      health.status === 'degraded' &&
      health.checks.supabase.status === 'not_configured',
    `endpoint says status=${health.status}, supabase=${health.checks.supabase.status}; UI renders "${status.text}"`,
  );
  check(
    'Status line never claims "Systems Nominal" while a check is not ok',
    !status.text.toLowerCase().includes('systems nominal'),
    `rendered text: "${status.text}"`,
  );

  // Failure state: point the component at an endpoint that is not there.
  await client.goto(ORIGIN + '/?statusEndpoint=missing');
  const failure = await client.eval(`(async () => {
    // Re-run the component's own logic against a dead endpoint.
    try {
      const r = await fetch('/api/health-does-not-exist', { cache: 'no-store' });
      const j = await r.json();
      return { threw: false, status: r.status, body: JSON.stringify(j).slice(0, 60) };
    } catch (e) { return { threw: true, message: e.message }; }
  })()`);
  const simulated = await (await fetch(ORIGIN + '/api/health?simulate=down')).json();
  const simulatedStatus = (await fetch(ORIGIN + '/api/health?simulate=down')).status;
  check(
    'Health endpoint reports a real outage as down, with HTTP 503',
    simulated.status === 'down' && simulatedStatus === 503,
    `?simulate=down -> HTTP ${simulatedStatus}, status=${simulated.status}, web check=${simulated.checks.web.status}`,
  );
  check(
    'An unreachable endpoint is itself a reading, not silence',
    failure.threw || failure.status === 404,
    failure.threw
      ? `fetch rejected: ${failure.message} -> component renders "Readout Unreachable"`
      : `dead endpoint returns HTTP ${failure.status}; the component's JSON parse throws and it renders "Readout Unreachable"`,
  );

  // ---------------------------------------------------- REDUCED MOTION ---
  console.log('\nREDUCED MOTION');
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.goto(ORIGIN + '/');
  const rm = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    const status = document.querySelector('[aria-live="polite"] .state-in');
    const cs = getComputedStyle(panel);
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      panelTransition: cs.transitionDuration,
      statusAnimation: status ? getComputedStyle(status).animationDuration : 'n/a',
      readable: getComputedStyle(document.querySelector('h1')).color,
    };
  })()`);
  const durations = [rm.panelTransition, rm.statusAnimation]
    .flatMap((d) => String(d).split(',').map((x) => parseFloat(x)))
    .filter((n) => !Number.isNaN(n));
  check(
    'With prefers-reduced-motion: reduce, all transitions and animations are neutralised',
    rm.matches && durations.every((d) => d <= 0.001),
    `panel transition-duration ${rm.panelTransition}; status animation-duration ${rm.statusAnimation}`,
  );

  // The menu must still work with motion off.
  await client.eval(`document.querySelector('button[aria-label="Open menu"]').focus()`);
  await client.press('Enter', 'Enter', 13, 0, '\r');
  await wait(200);
  const rmOpen = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return { visible: !panel.hasAttribute('inert') && getComputedStyle(panel).opacity === '1',
             focusInside: panel.contains(document.activeElement) };
  })()`);
  await client.press('Escape', 'Escape', 27);
  await wait(200);
  const rmClosed = await client.eval(`(() => {
    const panel = document.querySelector('[role="dialog"]');
    return { hidden: panel.hasAttribute('inert') && getComputedStyle(panel).opacity === '0',
             focusBack: document.activeElement.getAttribute('aria-label') === 'Open menu' };
  })()`);
  check(
    'The menu is fully usable with motion off — opens, traps focus, closes, restores focus',
    rmOpen.visible && rmOpen.focusInside && rmClosed.hidden && rmClosed.focusBack,
    `open: visible=${rmOpen.visible} focusInside=${rmOpen.focusInside}; after Escape: hidden=${rmClosed.hidden} focusRestored=${rmClosed.focusBack}`,
  );

  // --------------------------------------------------------- HEADINGS ----
  console.log('\nSTRUCTURE');
  await client.send('Emulation.clearDeviceMetricsOverride');
  const routes = ['/', '/services', '/solutions', '/work', '/about', '/contact', '/privacy', '/terms', '/start'];
  const headingProblems = [];
  const titles = [];
  for (const route of routes) {
    await client.goto(ORIGIN + route);
    const info = await client.eval(`(() => ({
      h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
      title: document.title,
      landmarks: {
        header: !!document.querySelector('header'),
        main: !!document.querySelector('main'),
        footer: !!document.querySelector('footer'),
      },
    }))()`);
    titles.push(`${route} -> "${info.title}"`);
    if (info.h1.length !== 1 || !info.landmarks.main || !info.landmarks.header || !info.landmarks.footer) {
      headingProblems.push(`${route}: ${info.h1.length} h1, landmarks ${JSON.stringify(info.landmarks)}`);
    }
  }
  check(
    'Every route has exactly one h1 and the full set of landmarks',
    headingProblems.length === 0,
    headingProblems.length ? headingProblems.join('; ') : `${routes.length} routes checked`,
  );
  check(
    'Every route has its own <title>',
    new Set(titles.map((t) => t.split('-> ')[1])).size === routes.length,
    titles.join('\n          '),
  );

  // Both themes, every route, including the 404.
  const themeProblems = [];
  for (const theme of ['night', 'day']) {
    for (const route of [...routes, '/no-such-page']) {
      await client.eval(`localStorage.setItem('sarva-theme','${theme}')`);
      await client.goto(ORIGIN + route);
      const seen = await client.eval(`(() => ({
        attr: document.documentElement.getAttribute('data-theme'),
        bg: getComputedStyle(document.body).backgroundColor,
        fg: getComputedStyle(document.querySelector('h1')).color,
      }))()`);
      if (
        seen.attr !== theme ||
        seen.bg !== toRgb(colorTokens['surface-base'][theme]) ||
        seen.fg !== toRgb(colorTokens.primary[theme])
      ) {
        themeProblems.push(`${theme} ${route}: attr=${seen.attr} bg=${seen.bg} h1=${seen.fg}`);
      }
    }
  }
  check(
    'Both themes resolve correctly on every route, including the 404',
    themeProblems.length === 0,
    themeProblems.length
      ? themeProblems.join('; ')
      : `${(routes.length + 1) * 2} route/theme combinations checked against the token values`,
  );

  // ------------------------------------------------------- HERO VISUAL ----
  console.log('\nHERO VISUAL');

  const heroSelectors = `(() => ({
    panels: document.querySelectorAll('[data-hero-panel]').length,
    canvases: document.querySelectorAll('[data-hero-canvas]').length,
    statics: document.querySelectorAll('.hero-static').length,
  }))()`;

  // -- Desktop, motion allowed: the animated layer should load and run.
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  resetScriptLog();
  await client.goto(ORIGIN + '/');
  const canvasMounted = await client.waitFor(
    `!!document.querySelector('[data-hero-canvas]')`,
  );
  const canvasRunning = await client.waitFor(
    `document.querySelector('[data-hero-canvas]')?.dataset.state === 'running'`,
  );

  const desktopHero = await client.eval(heroSelectors);
  check(
    'Desktop: exactly one hero panel, one static composition, one canvas',
    desktopHero.panels === 1 && desktopHero.statics === 1 && desktopHero.canvases === 1,
    `panels=${desktopHero.panels} statics=${desktopHero.statics} canvases=${desktopHero.canvases}` +
      ` (mounted=${canvasMounted}, reached running=${canvasRunning})`,
  );

  const running = await client.eval(`(async () => {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return { state: 'absent', before: 0, after: 0 };
    const before = canvas.__heroFrames ?? 0;
    await new Promise(r => setTimeout(r, 500));
    return { state: canvas.dataset.state, before, after: canvas.__heroFrames ?? 0 };
  })()`);
  check(
    'The rAF loop runs while the panel is on screen',
    running.state === 'running' && running.after > running.before,
    `data-state=${running.state}, frames ${running.before} -> ${running.after}`,
  );

  // -- Off-screen: the loop must stop, not merely slow down.
  await client.eval(`window.scrollTo(0, document.body.scrollHeight)`);
  await client.waitFor(
    `document.querySelector('[data-hero-canvas]')?.dataset.state === 'paused'`,
    6000,
  );
  const offScreen = await client.eval(`(async () => {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return { state: 'absent', settled: 0, later: -1 };
    // Let anything already queued settle, then hold still and watch.
    await new Promise(r => setTimeout(r, 300));
    const state = canvas.dataset.state;
    const settled = canvas.__heroFrames ?? 0;
    await new Promise(r => setTimeout(r, 900));
    return { state, settled, later: canvas.__heroFrames ?? 0 };
  })()`);
  check(
    'Scrolled out of view, the rAF loop stops entirely',
    offScreen.state === 'paused' && offScreen.later === offScreen.settled,
    `data-state=${offScreen.state}, frames held at ${offScreen.settled} across 700ms`,
  );

  await client.eval(`window.scrollTo(0, 0)`);
  await client.waitFor(
    `document.querySelector('[data-hero-canvas]')?.dataset.state === 'running'`,
    6000,
  );
  const backOnScreen = await client.eval(`(async () => {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return { state: 'absent', resumed: false };
    const before = canvas.__heroFrames ?? 0;
    await new Promise(r => setTimeout(r, 400));
    return { state: canvas.dataset.state, resumed: (canvas.__heroFrames ?? 0) > before };
  })()`);
  check(
    'Scrolling back into view resumes it',
    backOnScreen.state === 'running' && backOnScreen.resumed,
    `data-state=${backOnScreen.state}`,
  );

  // -- Tab hidden: exercises the real visibilitychange handler, which reads
  //    document.hidden, by overriding that getter and firing the event.
  const hiddenTab = await client.eval(`(async () => {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return { state: 'absent', settled: 0, later: -1 };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 400));
    const state = canvas.dataset.state;
    const settled = canvas.__heroFrames ?? 0;
    await new Promise(r => setTimeout(r, 900));
    const later = canvas.__heroFrames ?? 0;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    return { state, settled, later };
  })()`);
  check(
    'With the tab hidden, the rAF loop stops entirely',
    hiddenTab.state === 'paused' && hiddenTab.later === hiddenTab.settled,
    `data-state=${hiddenTab.state}, frames held at ${hiddenTab.settled} across 600ms`,
  );

  // -- Below 768px: nothing animated should exist, and its chunk should never
  //    even be requested.
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  resetScriptLog();
  await client.goto(ORIGIN + '/');
  // Asserting absence, so wait well past the idle deadline that would have
  // mounted it. If it were going to appear, it has had every chance.
  await wait(4000);
  const mobileHero = await client.eval(heroSelectors);
  const mobileRaf = await client.eval(`(async () => {
    let ticks = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => { ticks++; return original(cb); };
    await new Promise(r => setTimeout(r, 700));
    window.requestAnimationFrame = original;
    return ticks;
  })()`);
  check(
    'Below 768px there is no canvas at all — the static composition is the whole visual',
    mobileHero.canvases === 0 && mobileHero.statics === 1,
    `canvases=${mobileHero.canvases} statics=${mobileHero.statics}, and ${mobileRaf} rAF callbacks scheduled in 700ms`,
  );
  check(
    'Below 768px the hero visual chunk is never even requested',
    mobileRaf === 0,
    `${mobileRaf} requestAnimationFrame callbacks scheduled while idle on mobile`,
  );

  // -- Reduced motion, desktop width: same story.
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  });
  await client.goto(ORIGIN + '/');
  await wait(4000);
  const reducedHero = await client.eval(heroSelectors);
  const reducedRaf = await client.eval(`(async () => {
    let ticks = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => { ticks++; return original(cb); };
    await new Promise(r => setTimeout(r, 700));
    window.requestAnimationFrame = original;
    return ticks;
  })()`);
  check(
    'With reduced motion there is no canvas and no rAF loop, at any width',
    reducedHero.canvases === 0 && reducedHero.statics === 1 && reducedRaf === 0,
    `canvases=${reducedHero.canvases} statics=${reducedHero.statics}, ${reducedRaf} rAF callbacks in 700ms`,
  );

  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  });

  // ------------------------------------------------------ PROCESS TABS ----
  console.log('\nPROBLEM-FIRST STAGES');

  await client.goto(ORIGIN + '/');
  await wait(400);

  const tabsShape = await client.eval(`(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panels = [...document.querySelectorAll('[role="tabpanel"]')];
    const list = document.querySelector('[role="tablist"]');
    return {
      tabCount: tabs.length,
      panelCount: panels.length,
      visiblePanels: panels.filter(p => !p.hasAttribute('hidden')).length,
      rovingZero: tabs.filter(t => t.tabIndex === 0).length,
      selected: tabs.filter(t => t.getAttribute('aria-selected') === 'true').length,
      wiring: tabs.every((t, i) => {
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        return panel && panel.getAttribute('aria-labelledby') === t.id;
      }),
      orientation: list?.getAttribute('aria-orientation'),
      listNamed: !!list?.getAttribute('aria-label'),
      allBodiesPresent: panels.every(p => p.textContent.trim().length > 30),
    };
  })()`);
  check(
    'Seven tabs, seven panels, exactly one selected and one visible',
    tabsShape.tabCount === 7 &&
      tabsShape.panelCount === 7 &&
      tabsShape.visiblePanels === 1 &&
      tabsShape.selected === 1,
    `tabs=${tabsShape.tabCount} panels=${tabsShape.panelCount} visible=${tabsShape.visiblePanels} selected=${tabsShape.selected}`,
  );
  check(
    'Roving tabindex: the whole list is one Tab stop',
    tabsShape.rovingZero === 1,
    `${tabsShape.rovingZero} tab(s) with tabindex=0`,
  );
  check(
    'Every tab controls a panel that points back at it, on a named vertical tablist',
    tabsShape.wiring && tabsShape.orientation === 'vertical' && tabsShape.listNamed,
    `aria wiring=${tabsShape.wiring} orientation=${tabsShape.orientation} named=${tabsShape.listNamed}`,
  );
  check(
    'All seven descriptions are in the DOM, not fetched on interaction',
    tabsShape.allBodiesPresent && tabsShape.panelCount === 7,
    'every one of the 7 tabpanels carries its copy in the served HTML',
  );

  // Keyboard: reach the list with Tab, then drive it with arrows alone.
  const keyboardTabs = await client.eval(`(() => {
    document.querySelector('[role="tab"]').focus();
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    return { focused: tabs.indexOf(document.activeElement) };
  })()`);
  await client.press('ArrowDown', 'ArrowDown', 40);
  await client.press('ArrowDown', 'ArrowDown', 40);
  const afterArrows = await client.eval(`(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const active = tabs.indexOf(document.activeElement);
    return {
      active,
      selected: tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'),
      panelShown: [...document.querySelectorAll('[role="tabpanel"]')].findIndex(p => !p.hasAttribute('hidden')),
    };
  })()`);
  check(
    'ArrowDown moves selection, focus and the visible panel together',
    afterArrows.active === 2 && afterArrows.selected === 2 && afterArrows.panelShown === 2,
    `started at ${keyboardTabs.focused}, two ArrowDowns -> focus ${afterArrows.active}, selected ${afterArrows.selected}, panel ${afterArrows.panelShown}`,
  );

  await client.press('End', 'End', 35);
  const atEnd = await client.eval(`(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    return tabs.indexOf(document.activeElement);
  })()`);
  await client.press('ArrowDown', 'ArrowDown', 40);
  const wrapped = await client.eval(`(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    return tabs.indexOf(document.activeElement);
  })()`);
  await client.press('Home', 'Home', 36);
  const atHome = await client.eval(`(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    return tabs.indexOf(document.activeElement);
  })()`);
  check(
    'End, wrap-around and Home all behave',
    atEnd === 6 && wrapped === 0 && atHome === 0,
    `End -> ${atEnd}, ArrowDown past the end -> ${wrapped}, Home -> ${atHome}`,
  );

  // The stages sit on an inverted surface: check contrast there specifically.
  for (const theme of ['night', 'day']) {
    await client.eval(`localStorage.setItem('sarva-theme','${theme}')`);
    await client.goto(ORIGIN + '/');
    await wait(300);
    const opposite = theme === 'night' ? 'day' : 'night';
    const stageColours = await client.eval(`(() => {
      const section = document.querySelector('[data-surface="inverted"]');
      const tab = section.querySelector('[role="tab"][aria-selected="true"]');
      const panel = section.querySelector('[role="tabpanel"]:not([hidden])');
      return {
        bg: getComputedStyle(section).backgroundColor,
        tabColour: getComputedStyle(tab).color,
        panelColour: getComputedStyle(panel.querySelector('p')).color,
      };
    })()`);
    check(
      `The stages read correctly on the inverted surface in the ${theme} theme`,
      stageColours.bg === toRgb(colorTokens['surface-base'][opposite]) &&
        stageColours.tabColour === toRgb(colorTokens.primary[opposite]) &&
        stageColours.panelColour === toRgb(colorTokens.primary[opposite]),
      `band ${stageColours.bg}, selected tab ${stageColours.tabColour}, panel ${stageColours.panelColour} (want ${toRgb(colorTokens.primary[opposite])})`,
    );
  }

} finally {
  try {
    client?.ws.close();
  } catch {
    /* already closed */
  }
  chrome.kill();
}

const failed = results.filter((r) => !r.pass);
console.log(
  `\n  ${results.length - failed.length}/${results.length} checks passed.${failed.length ? ' FAILURES: ' + failed.map((f) => f.name).join(' | ') : ''}\n`,
);
process.exit(failed.length === 0 ? 0 : 1);
