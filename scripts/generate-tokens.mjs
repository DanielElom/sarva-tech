/**
 * Generates styles/tokens.css from lib/tokens.data.mjs.
 *
 * Why generated: CLAUDE.md 4.3 allows literal colour values in exactly one
 * place. Hand-writing the CSS as well would create a second place, and the two
 * would drift. Run via `pnpm tokens` (wired into predev/prebuild).
 *
 * Do not edit styles/tokens.css by hand.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  colorTokens,
  shadowTokens,
  typeScale,
  leading,
  tracking,
  radii,
  layout,
  themes,
} from '../lib/tokens.data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PREFIX = '--sv';
const other = (theme) => (theme === 'night' ? 'day' : 'night');

/** The runtime variable set for one theme, indented. */
function varsFor(theme, indent = '  ') {
  const lines = Object.entries(colorTokens).map(
    ([name, byTheme]) => `${indent}${PREFIX}-${name}: ${byTheme[theme]};`,
  );
  lines.push(`${indent}${PREFIX}-shadow-elevated: ${shadowTokens.elevated[theme]};`);
  lines.push(`${indent}color-scheme: ${theme === 'night' ? 'dark' : 'light'};`);
  return lines.join('\n');
}

const banner = `/*
 * GENERATED FILE — DO NOT EDIT.
 * Source: lib/tokens.data.mjs   Generator: scripts/generate-tokens.mjs
 * Regenerate with \`pnpm tokens\`.
 *
 * This file and lib/tokens.data.mjs are the only places a literal colour value
 * is permitted to exist (CLAUDE.md 4.3). Neither lives under app/ or components/,
 * so the hardcoded-colour grep over those directories returns nothing at all.
 */
`;

const sections = [banner];

// --- Theme resolution -------------------------------------------------------
// The inline script in components/chrome/theme-script.tsx always stamps
// data-theme on <html> before paint, so these attribute selectors are the live
// path. The prefers-color-scheme block is the no-JS fallback.
sections.push(`/* Day is the :root default so a no-JS, no-preference visitor gets a
   readable page. The theme script overrides before first paint. */
:root,
[data-theme='day'] {
${varsFor('day')}
}

[data-theme='night'] {
${varsFor('night')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${varsFor('night', '    ')}
  }
}`);

// --- Inverted surfaces ------------------------------------------------------
// CLAUDE.md 4.1: a section marked inverted flips against whatever theme is
// active. Re-declaring the WHOLE variable set (not just the background) is what
// makes text, muted text, accent-text and borders stay legible inside it.
const invertedBlocks = themes.map(
  (theme) => `[data-theme='${theme}'] [data-surface='inverted'] {
${varsFor(other(theme))}
}`,
);
// An inverted scope must re-declare `color` at its own root. Children inherit a
// COMPUTED colour, not the `var()` reference, so text inside an inverted section
// otherwise keeps the outer theme's colour while the background flips — legible
// by luck in one theme and not the other. Declaring it here means marking a
// section inverted is sufficient on its own; it is in `base` so ordinary
// utilities still override it.
sections.push(`@layer base {
  [data-surface='inverted'] {
    background-color: var(${PREFIX}-surface-base);
    color: var(${PREFIX}-primary);
  }
}

/* An inverted surface resolves the entire token set to the opposite theme,
   so anything rendered inside it stays legible without special-case classes. */
:root:not([data-theme]) [data-surface='inverted'] {
${varsFor('night')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) [data-surface='inverted'] {
${varsFor('day', '    ')}
  }
}

${invertedBlocks.join('\n\n')}`);

// --- Tailwind theme mapping -------------------------------------------------
// `@theme inline` makes the generated utilities reference the custom property
// rather than copy its value, which is what lets one class follow the theme.
const map = (ns, entries) =>
  entries.map(([k, v]) => `  --${ns}-${k}: ${v};`).join('\n');

sections.push(`@theme inline {
  /* Colour — CLAUDE.md 4.1 / 4.2 */
${map(
  'color',
  Object.keys(colorTokens).map((n) => [n, `var(${PREFIX}-${n})`]),
)}

  /* Type scale — 4.5, modular, base 16px, ratio 1.2 */
${map('text', Object.entries(typeScale))}

  /* Leading */
${map('leading', Object.entries(leading))}

  /* Tracking — caps is reserved for the systems-readout layer, 4.6 */
${map('tracking', Object.entries(tracking))}

  /* Radius — deliberate hierarchy, not one value everywhere */
${map('radius', Object.entries(radii))}

  /* Single elevation treatment */
  --shadow-elevated: var(${PREFIX}-shadow-elevated);

  /* Layout rhythm */
${map('spacing', [
  ['gutter', layout.gutter],
  ['section', layout.section],
])}
  --container-page: ${layout.container};
  --container-measure: ${layout.measure};

  /* Faces — bound to next/font in app/layout.tsx */
  --font-display: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace;
}`);

mkdirSync(join(root, 'styles'), { recursive: true });
writeFileSync(join(root, 'styles', 'tokens.css'), sections.join('\n\n') + '\n');

/*
 * The favicon is the Logo's mark, drawn from the same tokens. It is generated
 * into public/ rather than written into app/ so that no literal colour value
 * lands anywhere under app/ or components/ (CLAUDE.md 4.3). Change the mark in
 * components/chrome/logo.tsx and change it here — the two are the same object.
 */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Sarva Tech">
  <rect width="32" height="32" rx="6" fill="${colorTokens['surface-base'].night}"/>
  <rect x="9" y="9" width="14" height="14" rx="2" fill="${colorTokens.accent.night}"/>
</svg>
`;
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'favicon.svg'), favicon);

console.log(
  `styles/tokens.css written — ${Object.keys(colorTokens).length} colour tokens x ${themes.length} themes.`,
);
console.log('public/favicon.svg written from the same tokens.');
