import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * THE WORDMARK.
 *
 * This is the whole mark, in one file, on purpose. When a real logo is
 * commissioned (CLAUDE.md 13), it replaces the contents of this component and
 * nothing else in the codebase changes.
 *
 * The design decision, not a placeholder box:
 *
 *   Sarva Tech
 *   ^^^^^ ^^^^
 *   600   400
 *
 * Space Grotesk at two weights, set solid at -0.03em. "Sarva" carries the
 * weight because that is the name; "Tech" is the qualifier and sits back at
 * regular. The one piece of colour is a small accent square set on the
 * baseline — a filled block, which is the only thing `accent` is allowed to be
 * (CLAUDE.md 4.2). It reads as a status LED next to a device name, which is
 * the same instrument vocabulary as the rest of the site.
 *
 * At small sizes the square keeps the mark identifiable when the type stops
 * being legible, which is what a mark is for.
 */
export function Logo({
  className,
  /** Rendered as a link by default; pass false inside a nav that already links. */
  asLink = true,
  size = 'md',
}: {
  className?: string;
  asLink?: boolean;
  size?: 'sm' | 'md';
}) {
  const scale = size === 'sm' ? 'text-body' : 'text-lead';

  const mark = (
    <span
      className={cn(
        'site-logo font-display inline-flex items-baseline gap-[0.35em] leading-none',
        'tracking-display transition-[font-size] duration-200',
        scale,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="bg-accent inline-block size-[0.42em] translate-y-[-0.04em] rounded-xs"
      />
      <span>
        <span className="font-semibold">Sarva</span>
        <span className="font-normal"> Tech</span>
      </span>
    </span>
  );

  if (!asLink) return mark;

  return (
    // No aria-label: the visible wordmark IS the accessible name. An aria-label
    // that merely paraphrases visible text is a name/content mismatch, and it
    // is what a voice-control user would have to say to click this.
    <Link href="/" className="text-primary inline-flex rounded-xs">
      {mark}
    </Link>
  );
}
