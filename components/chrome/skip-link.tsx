/**
 * First thing in the tab order on every page. CLAUDE.md 7.
 * Visible only when focused, and it uses the same accent-text focus ring as
 * everything else.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-sm bg-surface-raised px-4 py-2 text-body text-accent-text focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:border focus:border-line-strong"
    >
      Skip to content
    </a>
  );
}
