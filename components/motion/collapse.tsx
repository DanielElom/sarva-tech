'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode } from 'react';
import { useMotionPreference } from './use-motion-preference';

/**
 * Animates a disclosure open and closed.
 *
 * This is motion answering a user action — open, expand, reveal — which
 * CLAUDE.md 5 says is always welcome. The height transition communicates cause
 * and effect: the thing you pressed is what grew. It is not decoration and it
 * never runs on its own.
 *
 * With reduced motion the panel simply exists or does not.
 */
export function Collapse({
  open,
  children,
  id,
}: {
  open: boolean;
  children: ReactNode;
  id?: string;
}) {
  const { reduced } = useMotionPreference();

  if (reduced) {
    return open ? (
      <div id={id} className="overflow-hidden">
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          id={id}
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 },
            opacity: { duration: 0.16 },
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
