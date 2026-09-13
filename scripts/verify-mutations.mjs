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
    name: 'Only the open technology panel is rendered',
    file: 'components/sections/technology-ecosystem.tsx',
    find: '          {CATEGORIES.map((category, index) => {',
    replace:
      '          {CATEGORIES.filter((_, i) => i === open).map((category, index) => {',
    artefact: 'CATEGORIES.filter((_, i) => i === open)',
    expect: 'Eight categories, eight panels, exactly one open',
  },
  {
    name: 'Technology aria-controls points at nothing',
    file: 'components/sections/technology-ecosystem.tsx',
    find: '                    aria-controls={panelId(index)}',
    replace: "                    aria-controls={panelId(index) + '-wrong'}",
    artefact: "panelId(index) + '-wrong'",
    expect: 'Each header is a button inside a heading',
  },
  {
    name: 'Closed technology panels are left in the accessibility tree',
    file: 'components/sections/technology-ecosystem.tsx',
    find: '                  inert={!expanded}',
    replace: '                  inert={false}',
    artefact: 'inert={false}',
    expect: 'All eight descriptions are in the DOM, and the seven closed panels are inert',
  },
  {
    name: 'Technology names given the monospace readout treatment',
    file: 'components/sections/technology-ecosystem.tsx',
    find: '                      <p className="font-display text-lead tracking-heading">',
    replace: '                      <p className="readout text-lead">',
    artefact: '<p className="readout text-lead">',
    expect: 'Technology names do not use the monospace readout treatment',
  },
  {
    name: 'Arrow keys no longer move between technology headers',
    file: 'components/sections/technology-ecosystem.tsx',
    find:
      "      case 'ArrowDown':\n" +
      '        event.preventDefault();\n' +
      '        focusHeader(index + 1);\n' +
      '        break;',
    replace: "      case 'ArrowDown':\n        break;",
    artefact: "case 'ArrowDown':\n        break;",
    expect: 'ArrowDown moves between headers and Enter opens the focused one',
  },
  {
    name: 'Home and End no longer jump to the first and last category',
    file: 'components/sections/technology-ecosystem.tsx',
    find:
      "      case 'Home':\n" +
      '        event.preventDefault();\n' +
      '        focusHeader(0);\n' +
      '        break;',
    replace: "      case 'Home':\n        break;",
    artefact: "case 'Home':\n        break;",
    expect: 'End and Home reach the last and first categories',
  },
  {
    name: 'Inverted marker dropped from the technology section',
    file: 'components/sections/technology-ecosystem.tsx',
    find: '      data-surface="inverted"',
    replace: '      data-x-surface="inverted"',
    artefact: 'data-x-surface="inverted"',
    expect: 'The technology section is inverted and reads correctly in the',
  },
  {
    name: 'One principle dropped from the list',
    file: 'components/sections/why-sarva-tech.tsx',
    find: '          {PRINCIPLES.map((principle) => (',
    replace: '          {PRINCIPLES.slice(0, 5).map((principle) => (',
    artefact: 'PRINCIPLES.slice(0, 5)',
    expect: 'Six principles, each with its copy in the DOM',
  },
  {
    name: 'Principles rendered as six identical cards',
    file: 'components/sections/why-sarva-tech.tsx',
    find: '              className="border-line border-t py-7 first:border-t-0 first:pt-0"',
    replace: '              className="elevated rounded-md p-7"',
    artefact: 'className="elevated rounded-md p-7"',
    expect: 'Principles are not rendered as six identical cards',
  },
  {
    name: 'Principle list given numbered markers',
    file: 'components/sections/why-sarva-tech.tsx',
    find: '        <ul className="flex flex-col">',
    replace: '        <ul className="list-decimal flex flex-col">',
    artefact: 'list-decimal',
    expect: 'The principle list carries no numbered markers',
  },
  {
    name: 'Only some categories rendered — content gated behind selection',
    file: 'components/sections/service-detail.tsx',
    find: '        {SERVICES.map((service) => (',
    replace: '        {SERVICES.slice(0, 2).map((service) => (',
    artefact: 'SERVICES.slice(0, 2)',
    expect: 'Five categories, each with all four fields',
  },
  {
    name: 'A map node points at a section that does not exist',
    file: 'components/sections/services-ecosystem.tsx',
    find: '                  href={`#${service.id}`}',
    replace: '                  href={`#${service.id}-missing`}',
    artefact: '`#${service.id}-missing`',
    expect: 'The ecosystem map has five nodes, each resolving to a section',
  },
  {
    name: 'Technology names given the monospace readout on /services',
    file: 'components/sections/service-detail.tsx',
    find: "                    <dd className=\"measure text-lead mt-1.5\">{service[field.key]}</dd>",
    replace: "                    <dd className=\"measure readout mt-1.5\">{service[field.key]}</dd>",
    artefact: 'className="measure readout mt-1.5"',
    expect: 'No readout treatment inside the service entries',
  },
  {
    name: 'Inverted marker dropped from the services map',
    file: 'components/sections/services-ecosystem.tsx',
    find: '    <section data-surface="inverted" aria-labelledby="services-map-heading">',
    replace: '    <section aria-labelledby="services-map-heading">',
    artefact: '<section aria-labelledby="services-map-heading">',
    expect: '/services has exactly one h1 and two inverted scopes',
  },
  {
    name: 'The :target marker reverts to the invisible top border',
    file: 'app/globals.css',
    find: '  .service-entry:target h3 {\n    color: var(--color-accent-text);\n  }',
    replace: '  .service-entry:target {\n    border-top-color: var(--color-accent-text);\n  }',
    artefact: '.service-entry:target {\n    border-top-color',
    expect: 'A map node is keyboard focusable and activating it visibly selects',
  },
  {
    name: 'The radial diagram is shrunk onto touch instead of replaced',
    file: 'components/sections/services-ecosystem.tsx',
    find: '        <div className="hidden lg:block">',
    replace: '        <div className="block">',
    artefact: '<div className="block">',
    expect: 'the radial diagram is replaced by full-size touch targets',
  },
  {
    name: 'Footer navigation labels put back into the readout treatment',
    file: 'components/chrome/footer.tsx',
    find:
      '                <p className="font-display text-primary text-sm font-medium">\n' +
      '                  {column.heading}\n' +
      '                </p>',
    replace: '                <span className="readout text-muted">{column.heading}</span>',
    artefact: '<span className="readout text-muted">{column.heading}</span>',
    expect: 'Footer navigation group labels do not use the readout treatment',
  },
  {
    name: 'Hero motion returned to the imperceptible settings',
    file: 'lib/hero-graph.ts',
    find: '      amplitude: 3.2 + random() * 1.8,\n      speed: 0.5 + random() * 0.32,',
    replace: '      amplitude: 1.6 + random() * 1.8,\n      speed: 0.08 + random() * 0.07,',
    artefact: 'speed: 0.08 + random() * 0.07',
    expect: 'The graph moves fast enough to be seen',
  },
  {
    name: 'Hero density dropped back to a sketch',
    file: 'lib/hero-graph.ts',
    find: 'const NODE_COUNT = 60;',
    replace: 'const NODE_COUNT = 18;',
    artefact: 'const NODE_COUNT = 18;',
    expect: 'The graph has the density of the approved design',
  },
  {
    name: 'Amber tier removed — nearly every node muted again',
    file: 'lib/hero-graph.ts',
    find: 'const isAccent = (id: number) => !isHub(id) && id % 3 === 1;',
    replace: 'const isAccent = (_id: number) => false;',
    artefact: 'const isAccent = (_id: number) => false;',
    expect: 'The graph has the density of the approved design',
  },
  {
    name: 'publicUrl link rendered even when absent',
    file: 'components/sections/solution-entries.tsx',
    find: '                {solution.publicUrl ? (',
    replace: "                {(solution.publicUrl ?? '#') ? (",
    artefact: "(solution.publicUrl ?? '#') ?",
    // The href needs the same fallback or the mutated file will not type-check,
    // and a mutation that does not compile tests nothing.
    also: {
      find: '                    href={solution.publicUrl}',
      replace: "                    href={solution.publicUrl ?? '#'}",
    },
    expect: 'An entry without publicUrl renders complete',
  },
  {
    name: 'Homepage preview hardcodes its entries instead of reading the MDX',
    file: 'components/sections/solutions-preview.tsx',
    find: '  const solutions = getFeaturedSolutions(2);',
    replace:
      "  const solutions = getFeaturedSolutions(2).map((s, i) => ({ ...s, name: i === 0 ? 'WoodMart' : s.name }));",
    artefact: "name: i === 0 ? 'WoodMart' : s.name",
    expect: 'The preview is not hardcoded',
  },
  {
    name: 'Inverted marker dropped from the solutions CTA',
    file: 'app/(site)/solutions/page.tsx',
    find: '      <section data-surface="inverted" aria-labelledby="solutions-cta-heading">',
    replace: '      <section aria-labelledby="solutions-cta-heading">',
    artefact: '<section aria-labelledby="solutions-cta-heading">',
    expect: '/solutions has one h1 and one inverted scope besides the footer',
  },
  {
    name: '/work redirect removed, leaving a dead route',
    file: 'next.config.ts',
    find: "    return [{ source: '/work', destination: '/solutions', permanent: true }];",
    replace: '    return [];',
    artefact: 'return [];',
    expect: '/work redirects permanently to /solutions',
  },
  {
    name: 'Progress bar left without an accessible name',
    file: 'components/sections/intake-flow.tsx',
    find: '          aria-label="Progress through the intake"\n',
    replace: '',
    artefact: null,
    expect: 'The progress bar has an accessible name',
  },
  {
    name: 'Honeypot field name echoed back to the sender',
    file: 'app/api/intake/route.ts',
    find: '    if (!key || key === HONEYPOT_FIELD) continue;',
    replace: '    void HONEYPOT_FIELD;\n    if (!key) continue;',
    artefact: 'void HONEYPOT_FIELD;',
    expect: 'The honeypot rejection does not name the honeypot field',
    api: true,
  },
  {
    name: 'Rate limiting removed from the submissions endpoint',
    file: 'app/api/intake/route.ts',
    find: '  const limit = checkRateLimit(clientKey(request.headers));',
    replace:
      '  const limit = { allowed: true, remaining: 99, retryAfter: 0 };\n  void checkRateLimit;\n  void clientKey;',
    artefact: 'const limit = { allowed: true, remaining: 99, retryAfter: 0 };',
    expect: 'A burst from one address is rate limited',
    api: true,
  },
  {
    name: 'Email failure is allowed to fail the whole submission',
    file: 'app/api/intake/route.ts',
    find: '  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });',
    replace:
      "  if (!notified.sent) {\n" +
      "    return NextResponse.json({ ok: false, error: 'mail failed' }, { status: 502 });\n" +
      '  }\n' +
      '  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });',
    artefact: "error: 'mail failed'",
    expect: 'A lead survives a broken Resend key',
    api: true,
    requiresSupabase: true,
    // The defect is invisible while mail works, so the server runs with a key
    // that cannot succeed and the suite is told to expect that.
    serverEnv: {
      RESEND_API_KEY: 're_broken_key_for_mutation_testing',
      SARVA_MAIL_BROKEN: '1',
    },
  },
  {
    name: 'Step 5 contact details written to browser storage',
    file: 'components/sections/intake-flow.tsx',
    find:
      '      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));\n' +
      '    } catch {\n' +
      '      // Private mode. The flow still works, it just will not survive a refresh.\n' +
      '    }\n' +
      '  }, [draft, hydrated, status.state]);',
    replace:
      '      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, ...details }));\n' +
      '    } catch {\n' +
      '      // Private mode. The flow still works, it just will not survive a refresh.\n' +
      '    }\n' +
      '  }, [draft, details, hydrated, status.state]);',
    artefact: 'JSON.stringify({ ...draft, ...details })',
    expect: 'Step 5 contact details are NOT persisted to browser storage',
  },
  {
    name: 'Draft persistence clobbers the saved answers on mount again',
    file: 'components/sections/intake-flow.tsx',
    find: '    if (!hydrated || status.state === \'sent\') return;',
    replace: "    if (status.state === 'sent') return;",
    artefact: "    if (status.state === 'sent') return;\n    try {\n      sessionStorage.setItem",
    expect: 'A refresh mid-flow restores the earlier answers',
  },
  {
    name: 'Honeypot given a real tab stop',
    file: 'components/sections/intake-flow.tsx',
    find: '              tabIndex={-1}\n              autoComplete="off"',
    replace: '              autoComplete="off"',
    artefact: null,
    expect: 'The honeypot exists but is out of the tab order',
  },
  {
    name: 'WhatsApp demoted below the contact form',
    file: 'app/(site)/contact/page.tsx',
    find: '      <section data-surface="inverted" aria-labelledby="contact-direct-heading">',
    replace: '      <section id="moved" aria-labelledby="contact-direct-heading">',
    artefact: '<section id="moved"',
    expect: 'WhatsApp is surfaced before the form, in its own inverted band',
  },
  {
    name: 'Panel capped in width again — a strip of the page shows beside it',
    file: 'components/chrome/mobile-menu.tsx',
    find: "          'sheet fixed inset-0 z-50 flex w-full flex-col md:hidden',",
    replace:
      "          'sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col md:hidden',",
    artefact: 'max-w-sm',
    expect: 'The open panel covers the whole viewport',
  },
  {
    name: 'Initial focus falls back to the first focusable (the wordmark)',
    file: 'components/chrome/mobile-menu.tsx',
    find:
      '      const target =\n' +
      '        closeRef.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);',
    replace:
      '      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);',
    artefact: 'const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);',
    expect: 'Initial focus lands on the close button',
  },
  {
    name: 'Inverted surface marker dropped from the stages section',
    file: 'components/sections/problem-first.tsx',
    find: '    <section data-surface="inverted" aria-labelledby={`${baseId}-heading`}>',
    replace: '    <section aria-labelledby={`${baseId}-heading`}>',
    artefact: null, // an absence, not a string; caught by byte-comparison
    expect: 'The stages section is itself inverted',
  },
];

/**
 * MUTATION_ONLY re-runs a subset by name substring. A run that ends
 * inconclusive — the suite hit its ceiling on a loaded machine — needs
 * repeating on its own, not the whole set again.
 */
const only = process.env.MUTATION_ONLY;
const SELECTED = only
  ? MUTATIONS.filter((m) => m.name.toLowerCase().includes(only.toLowerCase()))
  : MUTATIONS;
if (only && SELECTED.length === 0) {
  console.error(`\n  No mutation matches ${JSON.stringify(only)}.\n`);
  process.exit(2);
}

// Snapshot and integrity checks still cover every target, not just the subset,
// so a filtered run cannot leave an unrelated file mutated.
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
  let mutated = source.replace(mutation.find, mutation.replace);
  if (mutation.also) {
    if (mutated.split(mutation.also.find).length - 1 !== 1) {
      throw new Error(`${mutation.name}: secondary anchor did not match exactly once`);
    }
    mutated = mutated.replace(mutation.also.find, mutation.also.replace);
  }
  writeFileSync(path, mutated);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSuite(serverEnv = {}) {
  const build = spawnSync('pnpm', ['exec', 'next', 'build'], {
    cwd: root,
    encoding: 'utf-8',
  });
  if (build.status !== 0) {
    return { buildFailed: true, output: `${build.stdout ?? ''}${build.stderr ?? ''}` };
  }

  /*
   * The SERVER needs the mutation's environment too, not just the suite.
   *
   * This was missing and the failure was silent in the worst way: the suite saw
   * SARVA_MAIL_BROKEN and ran the mail check, while the server it was checking
   * still held the real Resend key. Mail succeeded, the route answered 201, the
   * check passed — and the harness reported that a real defect went undetected.
   * A check cannot catch a defect the running system does not have.
   */
  const server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, ...serverEnv },
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
    /*
     * Hard ceiling. A mutation can put the page into a state a check waits on
     * forever; one hung run must not consume the whole session. Exceeding this
     * is reported as inconclusive, never as a pass.
     */
    /*
     * Both suites run: the browser assertions and the API contract. A mutation
     * to the route handler has nothing to trip in verify-ui, and one to the
     * flow has nothing to trip in the API contract, so a harness that ran only
     * one of them would report half its defects as undetected.
     */
    let output = '';
    let timedOut = false;
    for (const script of ['scripts/verify-ui.mjs', 'scripts/verify-intake-api.mjs']) {
      const suite = spawnSync('node', [join(root, script), ORIGIN], {
        cwd: root,
        encoding: 'utf-8',
        env: { ...process.env, ...serverEnv, SARVA_SCOPE: 'home' },
        timeout: 8 * 60 * 1000,
        killSignal: 'SIGKILL',
      });
      output += `${suite.stdout ?? ''}${suite.stderr ?? ''}`;
      if (suite.error?.code === 'ETIMEDOUT' || suite.signal === 'SIGKILL') timedOut = true;
    }
    if (timedOut) return { timedOut: true, buildFailed: false, output };
    return { buildFailed: false, output };
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

/**
 * How many checks reported at all, pass or fail.
 *
 * A suite that crashes prints nothing useful — Node discards buffered stdout on
 * an uncaught exception — and the harness then sees no failures and calls the
 * mutation undetected. That is indistinguishable from a genuinely missed defect
 * and it has now sent me chasing working checks twice. Zero reported checks
 * means the run did not happen, which is inconclusive, not a pass.
 */
function reportedChecks(output) {
  return output.split('\n').filter((line) => /^\s+(ok|FAIL)\s{2}/.test(line)).length;
}

let undetected = 0;
const results = [];
console.log('\nMUTATION TESTING — each check run against the defect it exists to catch\n');

try {
  const hasCredentials = existsSync(join(root, '.env.local'));
  for (const mutation of SELECTED) {
    if (mutation.requiresSupabase && !hasCredentials) {
      results.push({
        mutation,
        caught: false,
        skipped: true,
        failures: ['(needs .env.local — not exercised)'],
      });
      console.log(`  SKIP  ${mutation.name}\n          needs real Supabase credentials; not exercised`);
      continue;
    }
    apply(mutation);
    const { buildFailed, timedOut, output } = await runSuite(mutation.serverEnv ?? {});

    const problems = restoreAll();
    if (problems.length) {
      console.error('\n  RESTORE FAILED:\n' + problems.map((p) => `    ${p}`).join('\n'));
      process.exit(3);
    }

    if (buildFailed || timedOut) {
      undetected++;
      // Show WHY it did not compile. "did not compile" alone sends you reading
      // the mutation when the answer is usually one line of tsc output.
      const reason = buildFailed
        ? (output ?? '')
            .split('\n')
            .filter((l) => /error TS|Type error|Failed to compile|^\s*\.\/|Error:/.test(l))
            .slice(0, 3)
            .map((l) => l.trim())
            .join(' | ')
        : '';
      const why = buildFailed
        ? `(mutation did not compile) ${reason}`
        : '(suite timed out — inconclusive)';
      results.push({ mutation, caught: false, failures: [why] });
      console.log(`  SKIP  ${mutation.name}\n          ${why}`);
      continue;
    }

    const reported = reportedChecks(output);
    if (reported === 0) {
      undetected++;
      const why = '(suite reported no checks at all — inconclusive, not a pass)';
      results.push({ mutation, caught: false, skipped: true, failures: [why] });
      console.log(`  SKIP  ${mutation.name}\n          ${why}`);
      continue;
    }

    const failures = failedChecks(output);
    const caught = failures.some((name) => name.includes(mutation.expect));
    if (!caught) undetected++;
    results.push({ mutation, caught, failures, skipped: false });

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
for (const { mutation, caught, failures, skipped } of results) {
  console.log(`  ${skipped ? 'skipped ' : caught ? 'caught  ' : 'MISSED  '}${mutation.name}`);
  if (!caught) console.log(`            failing instead: ${failures.join(' | ') || 'nothing'}`);
}
console.log(
  `\n  ${undetected === 0 ? 'Every check caught its own defect.' : `${undetected} check(s) did NOT catch their defect`}` +
    `${dirty === 0 ? ' Tree verified clean.' : ` ${dirty} integrity problem(s).`}\n`,
);
process.exit(undetected === 0 && dirty === 0 ? 0 : 1);
