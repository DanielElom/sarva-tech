// Contrast verification. Run: node scripts/contrast.mjs
import { colorTokens, palette } from '../lib/tokens.data.mjs';

const srgb = (h) => {
  const v = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = srgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const f = (n) => n.toFixed(2).padStart(6) + ':1';

const pairs = [];
for (const theme of ['night', 'day']) {
  const t = (name) => colorTokens[name][theme];
  const base = t('surface-base');
  const raised = t('surface-raised');
  // NOTE: `accent` is deliberately absent — it is a FILL token (CLAUDE.md 4.2).
  // It is measured below only against `on-accent`, which is its only legal pairing.
  for (const name of ['primary', 'muted', 'accent-text', 'line-strong', 'status-ok', 'status-warn', 'status-down']) {
    pairs.push([theme, `${name} on surface-base`, ratio(t(name), base), 4.5]);
    pairs.push([theme, `${name} on surface-raised`, ratio(t(name), raised), 4.5]);
  }
  pairs.push([theme, 'on-accent on accent fill', ratio(t('on-accent'), t('accent')), 4.5]);
  // WCAG 1.4.11: a control needs a 3:1 boundary. The `accent` FILL is 1.96:1 on
  // the day base, so accent-filled controls carry an `accent-text` border, which
  // is what actually identifies the control. That border is the thing measured.
  pairs.push([theme, 'accent-text border of an accent control, on surface-base', ratio(t('accent-text'), base), 3]);
  pairs.push([theme, 'focus ring (accent-text) on surface-base', ratio(t('accent-text'), base), 3]);
  pairs.push([theme, 'focus ring (accent-text) on surface-raised', ratio(t('accent-text'), raised), 3]);
  pairs.push([theme, 'line on surface-base (hairline, decorative)', ratio(t('line'), base), 0]);
  // inverted scope: tokens resolve to the opposite theme
  const other = theme === 'night' ? 'day' : 'night';
  const o = (name) => colorTokens[name][other];
  pairs.push([theme, 'INVERTED primary on surface-base', ratio(o('primary'), o('surface-base')), 4.5]);
  pairs.push([theme, 'INVERTED muted on surface-base', ratio(o('muted'), o('surface-base')), 4.5]);
  pairs.push([theme, 'INVERTED accent-text on surface-base', ratio(o('accent-text'), o('surface-base')), 4.5]);
}

let failed = 0;
let current = '';
for (const [theme, label, r, floor] of pairs) {
  if (theme !== current) {
    current = theme;
    console.log(`\n  ${theme.toUpperCase()}`);
  }
  const ok = floor === 0 || r >= floor;
  if (!ok) failed++;
  const flag = floor === 0 ? '  --' : ok ? '  ok' : 'FAIL';
  console.log(`  ${flag}  ${f(r)}  ${label}${floor ? ` (floor ${floor})` : ''}`);
}
console.log(`\n  ${failed === 0 ? 'All contrast floors met.' : `${failed} FAILURES`}\n`);
process.exit(failed === 0 ? 0 : 1);
