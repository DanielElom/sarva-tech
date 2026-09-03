/**
 * First thing in the tab order on every page. CLAUDE.md 7.
 * Visible only when focused, and it uses the same accent-text focus ring as
 * everything else.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="bg-surface-raised text-body text-accent-text focus:border-line-strong sr-only rounded-sm px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:border"
    >
      Skip to content
    </a>
  );
}
