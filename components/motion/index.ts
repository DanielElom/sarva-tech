/**
 * Motion primitives. CLAUDE.md 5.
 *
 * Three rules the set is built around:
 *  - every animation communicates something (cause and effect, state change,
 *    transformation) — decoration is cut;
 *  - non-user-triggered motion is rationed, so there is deliberately no
 *    scroll-reveal primitive here;
 *  - reduced motion renders the finished state, not a faster animation.
 *
 * `motion/react` is imported inside each primitive, never globally.
 */
export { MotionGate } from './motion-gate';
export { Collapse } from './collapse';
export { StateSwitch } from './state-switch';
export { SlideOver } from './slide-over';
export { useMotionPreference } from './use-motion-preference';
