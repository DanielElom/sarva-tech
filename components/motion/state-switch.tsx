'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode } from 'react';
import { useMotionPreference } from './use-motion-preference';

/**
 * Marks a state change — the readout said one thing, now it says another.
 *
 * CLAUDE.md 5 lists state change as one of the things animation is allowed to
 * communicate. Used by the live status line: when /api/health comes back and
 * the reading changes, the swap is visible rather than a silent text mutation
 * a visitor's eye skips over. Short, small, and only ever triggered by real
 * incoming data.
 *
 * With reduced motion the new value simply replaces the old one. Screen-reader
 * users get the change from the live region either way.
 */
export function StateSwitch({
  stateKey,
  children,
  className,
}: {
  /** Change this to signal that the content underneath is now different. */
  stateKey: string;
  children: ReactNode;
  className?: string;
}) {
  const { reduced } = useMotionPreference();

  if (reduced) return <span className={className}>{children}</span>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={stateKey}
        className={className}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
