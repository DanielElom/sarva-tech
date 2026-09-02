'use client';

import { type ReactNode } from 'react';
import { useMotionPreference } from './use-motion-preference';

/**
 * The reduced-motion-aware wrapper every other primitive is built on.
 *
 * It does not "animate faster" when motion is reduced — it renders `still`,
 * the final resting state, with no animation machinery mounted at all. That is
 * the difference between respecting the preference and pretending to.
 *
 * `motion/react` is never imported here. Each primitive imports it itself
 * (CLAUDE.md 5: motion imports are per component, never global).
 */
export function MotionGate({
  animated,
  still,
}: {
  /** Rendered when motion is allowed. */
  animated: ReactNode;
  /** Rendered when motion is reduced. Must be the finished, readable state. */
  still: ReactNode;
}) {
  const { reduced } = useMotionPreference();
  return <>{reduced ? still : animated}</>;
}
