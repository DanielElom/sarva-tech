import type { Metadata } from 'next';
import { IntakeFlow } from '@/components/sections/intake-flow';

export const metadata: Metadata = {
  title: 'Start a Project',
  description:
    'Tell Sarva Tech what is not working. Five short steps, and you will hear back with what we would build, what it would take, and whether we are the right people for it.',
  alternates: { canonical: '/start' },
  robots: { index: true, follow: true },
};

/**
 * CLAUDE.md 10: an action keeps the same name through a whole flow, so every
 * "Start a Project" button lands on a page headed the same way. The flow itself
 * supplies the h1, which changes per step — that is the page's real heading at
 * any moment, and duplicating a static one above it would give the page two.
 */
export default function StartPage() {
  return <IntakeFlow />;
}
