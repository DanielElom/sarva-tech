/**
 * Runs the verification suite against deliberately broken code.
 *
 * CLAUDE.md 14: a check that passes on the bug it was written for is
 * decorative. This applies one defect at a time, rebuilds, runs the suite, and
 * asserts that the specific check meant to catch it actually reports FAIL —
 * and that it is the one reporting it.
 *
 * Every mutation is reverted afterwards, including on failure or interrupt.
 *
 * Usage: node scripts/verify-mutations.mjs
 */
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3311;
const ORIGIN = `http://localhost:${PORT}`;

const MUTATIONS = [
  {
    name: 'IntersectionObserver pause removed — loop runs off-screen',
    file: 'components/sections/hero-node-graph-canvas.tsx',
    find: '        onScreen = entries.some((entry) => entry.isIntersecting);',
    replace: '        onScreen = true; void entries;',
    expect: 'Scrolled out of view, the rAF loop stops entirely',
  },
  {
    name: 'visibilitychange handler ignores document.hidden',
    file: 'components/sections/hero-node-graph-canvas.tsx',
    find: '      tabVisible = !document.hidden;',
    replace: '      tabVisible = true;',
    expect: 'With the tab hidden, the rAF loop stops entirely',
  },
  {
    name: 'Viewport gate removed — canvas mounts below 768px',
    file: 'components/sections/hero-node-graph-animator.tsx',
    find: '    const evaluate = () => setActive(wide.matches && !reduced.matches);',
    replace: '    const evaluate = () => setActive(!reduced.matches);',
    expect: 'Below 768px there is no canvas at all',
  },
  {
    name: 'Reduced-motion gate removed — canvas mounts anyway',
    file: 'components/sections/hero-node-graph-animator.tsx',
    find: '    const evaluate = () => setActive(wide.matches && !reduced.matches);',
    replace: '    const evaluate = () => setActive(wide.matches);',
    expect: 'With reduced motion there is no canvas and no rAF loop',
  },
  {
    name: 'Roving tabindex removed — every tab is a Tab stop',
    file: 'components/sections/problem-first.tsx',
    find: '                  tabIndex={active ? 0 : -1}',
    replace: '                  tabIndex={0}',
    expect: 'Roving tabindex: the whole list is one Tab stop',
  },
  {
    name: 'aria-controls points at nothing',
    file: 'components/sections/problem-first.tsx',
    find: '                  aria-controls={panelId(index)}',
    replace: "                  aria-controls={panelId(index) + '-wrong'}",
    expect: 'Every tab controls a panel that points back at it',
  },
  {
    name: 'Only the selected description is rendered',
    file: 'components/sections/problem-first.tsx',
    find: '            {STAGES.map((stage, index) => (',
    replace: '            {STAGES.filter((_, i) => i === selected).map((stage, index) => (',
    expect: 'Seven tabs, seven panels, exactly one selected and one visible',
  },
  {
    name: 'Inverted surface marker dropped from the stages section',
    file: 'components/sections/problem-first.tsx',
    find: '    <section data-surface="inverted" aria-labelledby={`${baseId}-heading`}>',
    replace: '    <section aria-labelledby={`${baseId}-heading`}>',
    expect: 'every inverted surface resolves to the',
  },
];

const originals = new Map();
function apply(mutation) {
  const path = join(root, mutation.file);
  const source = readFileSync(path, 'utf-8');
  if (!originals.has(path)) originals.set(path, source);
  const count = source.split(mutation.find).length - 1;
  if (count !== 1) {
    throw new Error(`${mutation.name}: anchor matched ${count} times in ${mutation.file}`);
  }
  writeFileSync(path, source.replace(mutation.find, mutation.replace));
}
function restoreAll() {
  for (const [path, source] of originals) writeFileSync(path, source);
  originals.clear();
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restoreAll();
    process.exit(130);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSuite() {
  const build = spawnSync('pnpm', ['exec', 'next', 'build'], {
    cwd: root,
    encoding: 'utf-8',
  });
  if (build.status !== 0) {
    return { buildFailed: true, output: `${build.stdout ?? ''}${build.stderr ?? ''}` };
  }

  const server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
  });
  try {
    for (let i = 0; i < 40; i++) {
      await wait(500);
      try {
        await fetch(ORIGIN + '/');
        break;
      } catch {
        /* not up yet */
      }
    }
    const suite = spawnSync('node', [join(root, 'scripts/verify-ui.mjs'), ORIGIN], {
      cwd: root,
      encoding: 'utf-8',
    });
    return { buildFailed: false, output: `${suite.stdout ?? ''}${suite.stderr ?? ''}` };
  } finally {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
    await wait(600);
  }
}

/** Names of checks reported as FAIL in a suite run. */
function failedChecks(output) {
  return output
    .split('\n')
    .filter((line) => line.trimStart().startsWith('FAIL'))
    .map((line) => line.trim().replace(/^FAIL\s+/, ''));
}

let broken = 0;
console.log('\nMUTATION TESTING — each check run against the defect it exists to catch\n');

try {
  for (const mutation of MUTATIONS) {
    apply(mutation);
    const { buildFailed, output } = await runSuite();
    restoreAll();

    if (buildFailed) {
      console.log(`  SKIP  ${mutation.name}\n          mutation did not compile`);
      broken++;
      continue;
    }

    const failures = failedChecks(output);
    const caught = failures.some((name) => name.includes(mutation.expect));
    if (!caught) broken++;
    console.log(`  ${caught ? 'ok  ' : 'FAIL'}  ${mutation.name}`);
    console.log(
      `          expected "${mutation.expect}" to fail — ${
        caught ? 'it did' : 'IT DID NOT'
      }; ${failures.length} check(s) failed in total`,
    );
    if (failures.length) {
      console.log(`          failing: ${failures.map((f) => f.slice(0, 58)).join(' | ')}`);
    }
  }
} finally {
  restoreAll();
}

console.log(
  `\n  ${broken === 0 ? 'Every check caught its defect.' : `${broken} check(s) did NOT catch their defect`}\n`,
);
process.exit(broken === 0 ? 0 : 1);
