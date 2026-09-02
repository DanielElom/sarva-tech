import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/lib/tokens';

/**
 * Runs before first paint, synchronously, in <head>. CLAUDE.md 4.1: no flash of
 * wrong theme on load.
 *
 * Order of authority: a stored manual choice wins; otherwise the visitor's
 * system preference. The attribute is stamped on <html> before the browser has
 * anything to paint, so the correct token set is already resolved.
 *
 * Kept deliberately tiny and dependency-free — it is inline, render-blocking
 * code, and every byte here is on the critical path.
 */
const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},a=${JSON.stringify(
  THEME_ATTRIBUTE,
)},s=localStorage.getItem(k),t=(s==='night'||s==='day')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'night':'day');document.documentElement.setAttribute(a,t);}catch(e){document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},'night');}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
