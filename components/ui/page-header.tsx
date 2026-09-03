import { Container } from './container';
import { Readout } from './readout';
import { type ReactNode } from 'react';

/**
 * The single h1 for a route, with an optional eyebrow.
 *
 * The eyebrow uses the readout treatment because a route identifier genuinely
 * is instrumentation — it names where you are in the system. That is the line
 * CLAUDE.md 4.6 draws.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <Container as="section" className="py-section">
      {eyebrow ? <Readout className="text-muted">{eyebrow}</Readout> : null}
      <h1 className="text-h1 leading-display tracking-display mt-4">{title}</h1>
      {intro ? <p className="measure text-lead text-muted mt-6">{intro}</p> : null}
      {children}
    </Container>
  );
}
