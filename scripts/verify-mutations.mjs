/**
 * Runs the verification suite against deliberately broken code.
 *
 * CLAUDE.md 14: a check that passes on the bug it was written for is
 * decorative. This applies one defect at a time, rebuilds, runs the suite, and
 * asserts that the check meant to catch it actually reports FAIL.
 *
 * SAFETY. This edits real source files in place, so it is built around the
 * assumption that it WILL be killed mid-run one day:
 *
 *  - every target is copied to a snapshot directory on disk before anything is
 *    mutated, and restored from those files — not from a variable in a process
 *    that may not live long enough to use it;
 *  - the snapshot directory is a fixed path, so a later run finds it and knows
 *    the previous one died;
 *  - it refuses to start unless every target is committed and matches HEAD, so
 *    `git checkout` is always a complete recovery;
 *  - after every mutation it verifies the restored file is byte-identical to
 *    the snapshot, and at the end that no mutation artefact survives anywhere.
 *
 * An earlier version kept the originals in memory and was SIGKILLed during a
 * build. It left a live defect in the working tree, and the check written to
 * detect that matched an unrelated line containing the same original text and
 * reported the file as intact. Both failures are addressed here.
 *
 * Usage: node scripts/verify-mutations.mjs
 */
import { spawnSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = join(root, '.mutation-snapshot');
const PORT = 3311;
const ORIGIN = `http://localhost:${PORT}`;

/**
 * `artefact` is the string that proves a mutation is still applied. It is
 * matched against the file AFTER restore, so it must be unique to the mutated
 * form — never a substring that also occurs in healthy code.
 */
const MUTATIONS = [
  {
    name: 'IntersectionObserver pause removed — loop runs off-screen',
    file: 'components/sections/hero-node-graph-canvas.tsx',
    find: '        onScreen = entries.some((entry) => entry.isIntersecting);',
    replace: '        onScreen = true; void entries;',
    artefact: 'onScreen = true; void entries;',
    expect: 'Scrolled out of view, the rAF loop stops entirely',
  },
  {
    name: 'visibilitychange handler ignores document.hidden',
    file: 'components/sections/hero-node-graph-canvas.tsx',
    find: '      tabVisible = !document.hidden;\n      sync();',
    replace: '      tabVisible = true;\n      sync();',
    artefact: 'tabVisible = true;\n      sync();',
    expect: 'With the tab hidden, the rAF loop stops entirely',
  },
  {
    name: 'Viewport gate removed — canvas mounts below 768px',
    file: 'components/sections/hero-node-graph-animator.tsx',
    find: '    const evaluate = () => setActive(wide.matches && !reduced.matches);',
    replace: '    const evaluate = () => setActive(!reduced.matches);',
    artefact: 'setActive(!reduced.matches)',
    expect: 'Below 768px there is no canvas at all',
  },
  {
    name: 'Reduced-motion gate removed — canvas mounts anyway',
    file: 'components/sections/hero-node-graph-animator.tsx',
    find: '    const evaluate = () => setActive(wide.matches && !reduced.matches);',
    replace: '    const evaluate = () => setActive(wide.matches);',
    artefact: 'setActive(wide.matches);',
    expect: 'With reduced motion there is no canvas and no rAF loop',
  },
  {
    name: 'Roving tabindex removed — every tab is a Tab stop',
    file: 'components/sections/problem-first.tsx',
    find: '                  tabIndex={active ? 0 : -1}',
    replace: '                  tabIndex={0}',
    artefact: '                  tabIndex={0}',
    expect: 'Roving tabindex: the whole list is one Tab stop',
  },
  {
    name: 'aria-controls points at nothing',
    file: 'components/sections/problem-first.tsx',
    find: '                  aria-controls={panelId(index)}',
    replace: "                  aria-controls={panelId(index) + '-wrong'}",
    artefact: "panelId(index) + '-wrong'",
    expect: 'Every tab controls a panel that points back at it',
  },
  {
    name: 'Only the selected description is rendered',
    file: 'components/sections/problem-first.tsx',
    find: '            {STAGES.map((stage, index) => (',
    replace: '            {STAGES.filter((_, i) => i === selected).map((stage, index) => (',
    artefact: 'STAGES.filter((_, i) => i === selected)',
    expect: 'Seven tabs, seven panels, exactly one selected and one visible',
  },
  {
    name: 'Inverted surface marker dropped from the stages section',
    file: 'components/sections/problem-first.tsx',
    find: '    <section data-surface="inverted" aria-labelledby={`${baseId}-heading`}>',
    replace: '    <section aria-labelledby={`${baseId}-heading`}>',
    artefact: null, // an absence, not a string; caught by byte-comparison
    expect: 'every inverted surface resolves to the',
  },
];

const TARGETS = [...new Set(MUTATIONS.map((m) => m.file))];
const snapshotPath = (file) => join(SNAPSHOT_DIR, file.replaceAll('/', '__'));

const fail = (message) => {
  console.error(`\n  REFUSING TO RUN\n\n  ${message}\n`);
  process.exit(2);
};

// -- Recover from a previous run that did not survive ------------------------
if (existsSync(SNAPSHOT_DIR)) {
  const recovered = [];
  for (const file of TARGETS) {
    const snapshot = snapshotPath(file);
    if (!existsSync(snapshot)) continue;
    const current = readFileSync(join(root, file), 'utf-8');
    const pristine = readFileSync(snapshot, 'utf-8');
    if (current !== pristine) {
      writeFileSync(join(root, file), pristine);
      recovered.push(file);
    }
  }
  rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  console.log(
    recovered.length
      ? `  Recovered ${recovered.length} file(s) from a previous run that did not finish:\n` +
          recovered.map((f) => `    ${f}`).join('\n')
      : '  Found a stale snapshot from a previous run; files were already intact.',
  );
}

// -- Name the exact defect if an artefact from a crashed run survived --------
// Runs before the general cleanliness check: when both fire, the specific
// message is the useful one.
for (const mutation of MUTATIONS) {
  const source = readFileSync(join(root, mutation.file), 'utf-8');

  if (mutation.artefact && source.includes(mutation.artefact)) {
    fail(
      `${mutation.file} still carries the artefact of a previous mutation:\n` +
        `    "${mutation.artefact.split('\n')[0]}"\n` +
        `  That is the defect "${mutation.name}".\n` +
        `  Run: git checkout -- ${mutation.file}`,
    );
  }

  /*
   * Identity and count, independent of whitespace (CLAUDE.md 14). Matching an
   * artefact string is only as precise as its indentation — `tabIndex={0}` is
   * a mutation at one nesting level and legitimate markup at another. The
   * healthy anchor being present exactly once is the robust invariant, and it
   * also catches a mutation whose replacement string is ambiguous.
   */
  const anchors = source.split(mutation.find).length - 1;
  if (anchors !== 1) {
    fail(
      `${mutation.file}: the healthy anchor for "${mutation.name}"\n` +
        `    "${mutation.find.trim().split('\n')[0]}"\n` +
        `  occurs ${anchors} time(s), expected exactly 1.\n` +
        `  Either a previous mutation survived, or the source moved on and this\n` +
        `  mutation needs updating. Run: git checkout -- ${mutation.file}`,
    );
  }
}

// -- Refuse to start on anything but a clean, committed tree -----------------
const status = spawnSync('git', ['status', '--porcelain', '--', ...TARGETS], {
  cwd: root,
  encoding: 'utf-8',
});
if (status.status !== 0) fail('git status failed; cannot establish a restore point.');
if (status.stdout.trim()) {
  fail(
    'These targets have uncommitted changes:\n\n' +
      status.stdout.trimEnd() +
      '\n\n  This harness edits source in place. Commit first, so that\n' +
      '  `git checkout -- <file>` is a complete recovery if it is interrupted.',
  );
}

// -- Snapshot to disk, before touching anything ------------------------------
mkdirSync(SNAPSHOT_DIR, { recursive: true });
for (const file of TARGETS) copyFileSync(join(root, file), snapshotPath(file));
writeFileSync(
  join(SNAPSHOT_DIR, 'README.txt'),
  'Snapshots taken by scripts/verify-mutations.mjs before mutating source.\n' +
    'If this directory exists, a run did not finish. The next run restores from\n' +
    'it automatically. You can also restore by hand, or with git checkout.\n',
);

/** Restore every target from the on-disk snapshot and prove it worked. */
function restoreAll() {
  const problems = [];
  for (const file of TARGETS) {
    const snapshot = snapshotPath(file);
    if (!existsSync(snapshot)) {
      problems.push(`${file}: snapshot missing`);
      continue;
    }
    const pristine = readFileSync(snapshot, 'utf-8');
    writeFileSync(join(root, file), pristine);
    // Identity, not "looks about right".
    if (readFileSync(join(root, file), 'utf-8') !== pristine) {
      problems.push(`${file}: restored content does not match the snapshot`);
    }
  }
  return problems;
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    restoreAll();
    rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
    process.exit(130);
  });
}

function apply(mutation) {
  const path = join(root, mutation.file);
  const source = readFileSync(path, 'utf-8');
  const occurrences = source.split(mutation.find).length - 1;
  // CLAUDE.md 14: identity AND count, never first match.
  if (occurrences !== 1) {
    throw new Error(
      `${mutation.name}: anchor occurs ${occurrences} times in ${mutation.file}, expected exactly 1`,
    );
  }
  writeFileSync(path, source.replace(mutation.find, mutation.replace));
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
    for (let i = 0; i < 60; i++) {
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
      env: { ...process.env, SARVA_SCOPE: 'home' },
    });
    return { buildFailed: false, output: `${suite.stdout ?? ''}${suite.stderr ?? ''}` };
  } finally {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
    await wait(800);
  }
}

function failedChecks(output) {
  return output
    .split('\n')
    .filter((line) => line.trimStart().startsWith('FAIL'))
    .map((line) => line.trim().replace(/^FAIL\s+/, ''));
}

let undetected = 0;
const results = [];
console.log('\nMUTATION TESTING — each check run against the defect it exists to catch\n');

try {
  for (const mutation of MUTATIONS) {
    apply(mutation);
    const { buildFailed, output } = await runSuite();

    const problems = restoreAll();
    if (problems.length) {
      console.error('\n  RESTORE FAILED:\n' + problems.map((p) => `    ${p}`).join('\n'));
      process.exit(3);
    }

    if (buildFailed) {
      undetected++;
      results.push({ mutation, caught: false, failures: ['(mutation did not compile)'] });
      console.log(`  SKIP  ${mutation.name}\n          mutation did not compile`);
      continue;
    }

    const failures = failedChecks(output);
    const caught = failures.some((name) => name.includes(mutation.expect));
    if (!caught) undetected++;
    results.push({ mutation, caught, failures });

    console.log(`  ${caught ? 'ok  ' : 'FAIL'}  ${mutation.name}`);
    console.log(
      `          target check "${mutation.expect}" — ${caught ? 'FAILED as intended' : 'DID NOT FAIL'}`,
    );
    console.log(
      `          ${failures.length} check(s) failed: ${failures.map((f) => f.slice(0, 52)).join(' | ') || 'none'}`,
    );
  }
} finally {
  const problems = restoreAll();
  if (problems.length) {
    console.error('\n  RESTORE FAILED:\n' + problems.map((p) => `    ${p}`).join('\n'));
  }
}

// -- Final proof that nothing survived ---------------------------------------
console.log('\nPOST-RUN INTEGRITY');
let dirty = 0;
for (const file of TARGETS) {
  const current = readFileSync(join(root, file), 'utf-8');
  const pristine = readFileSync(snapshotPath(file), 'utf-8');
  const identical = current === pristine;
  if (!identical) dirty++;
  console.log(`  ${identical ? 'ok  ' : 'FAIL'}  ${file} is byte-identical to its snapshot`);
}
for (const mutation of MUTATIONS) {
  if (!mutation.artefact) continue;
  const source = readFileSync(join(root, mutation.file), 'utf-8');
  const count = source.split(mutation.artefact).length - 1;
  if (count !== 0) dirty++;
  console.log(
    `  ${count === 0 ? 'ok  ' : 'FAIL'}  no artefact of "${mutation.name.slice(0, 44)}" (${count} occurrence(s))`,
  );
}

const gitAfter = spawnSync('git', ['status', '--porcelain', '--', ...TARGETS], {
  cwd: root,
  encoding: 'utf-8',
});
const treeClean = !gitAfter.stdout.trim();
if (!treeClean) dirty++;
console.log(
  `  ${treeClean ? 'ok  ' : 'FAIL'}  git reports the targets unmodified${treeClean ? '' : `:\n${gitAfter.stdout}`}`,
);

if (dirty === 0) rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
else console.log(`\n  Snapshot kept at ${basename(SNAPSHOT_DIR)}/ for recovery.`);

console.log('\nSUMMARY');
for (const { mutation, caught, failures } of results) {
  console.log(`  ${caught ? 'caught  ' : 'MISSED  '}${mutation.name}`);
  if (!caught) console.log(`            failing instead: ${failures.join(' | ') || 'nothing'}`);
}
console.log(
  `\n  ${undetected === 0 ? 'Every check caught its own defect.' : `${undetected} check(s) did NOT catch their defect`}` +
    `${dirty === 0 ? ' Tree verified clean.' : ` ${dirty} integrity problem(s).`}\n`,
);
process.exit(undetected === 0 && dirty === 0 ? 0 : 1);
