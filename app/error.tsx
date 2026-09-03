'use client';

import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button, ButtonLink } from '@/components/ui/button';
import { Readout } from '@/components/ui/readout';

/**
 * Route-level error boundary. Designed, not a framework default.
 *
 * It states what happened and what to do next, and it surfaces the digest so a
 * report can be matched to a log line. It does not apologise (CLAUDE.md 10).
 *
 * This cannot use SiteShell: the shell renders a footer whose status line
 * fetches, and an error page should do the least possible.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-surface-base flex min-h-dvh flex-col justify-center">
      <Container as="section" className="py-section">
        <Readout tone="accent">HTTP 500 · Unhandled Exception</Readout>
        <h1 className="text-h1 leading-display tracking-display mt-4">
          Something on this page failed.
        </h1>
        <p className="measure text-lead text-muted mt-6">
          The rest of the site is unaffected. Try the page again — if it fails a second
          time, it is our problem and not yours.
        </p>
        {error.digest ? (
          <p className="mt-6">
            <Readout className="text-muted">Digest {error.digest}</Readout>
          </p>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
          <Button onClick={reset}>Try Again</Button>
          <ButtonLink href="/" variant="secondary">
            Back to Home
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
