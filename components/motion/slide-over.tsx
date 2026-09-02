'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, type RefObject } from 'react';
import { useMotionPreference } from './use-motion-preference';

/**
 * A dialog panel that enters from the right edge, with a scrim behind it.
 *
 * User-triggered, and it communicates where the panel came from and where it
 * goes back to — a transformation, not a flourish (CLAUDE.md 5).
 *
 * The prop surface is deliberately narrow rather than "spread any div props".
 * Everything that makes this a usable dialog — focus trapping, Escape, scroll
 * lock, focus restore — lives in the consumer, because that is behaviour and
 * must work identically whether or not the animation runs.
 *
 * With reduced motion the panel appears and disappears in place.
 */
export function SlideOver({
  open,
  onDismiss,
  panelRef,
  panelId,
  label,
  scrimClassName,
  panelClassName,
  children,
}: {
  open: boolean;
  /** Clicking the scrim. */
  onDismiss: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  panelId: string;
  /** Accessible name for the dialog. */
  label: string;
  scrimClassName: string;
  panelClassName: string;
  children: ReactNode;
}) {
  const { reduced } = useMotionPreference();

  if (reduced) {
    if (!open) return null;
    return (
      <>
        <div aria-hidden="true" onClick={onDismiss} className={scrimClassName} />
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={panelClassName}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            aria-hidden="true"
            onClick={onDismiss}
            className={scrimClassName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={panelClassName}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40, mass: 0.8 }}
          >
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
