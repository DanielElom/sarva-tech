import { cn } from '@/lib/cn';
import { type ReactNode } from 'react';

/**
 * The systems-readout label. CLAUDE.md 4.6.
 *
 * Monospace, tracked caps. Reserved for instrumentation — hero panel chrome,
 * the live status line, technology labels, case-study metrics. It does not go
 * on body copy, headings, buttons, navigation or form labels. Routing every use
 * through this one component is what keeps that rule enforceable.
 */
export function Readout({
  children,
  className,
  tone = 'muted',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'primary' | 'accent';
}) {
  const toneClass =
    tone === 'accent' ? 'text-accent-text' : tone === 'primary' ? 'text-primary' : 'text-muted';
  return <span className={cn('readout', toneClass, className)}>{children}</span>;
}
