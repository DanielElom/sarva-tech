'use client';

import { useEffect, useState } from 'react';
import { Readout } from '@/components/ui/readout';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, type HealthReport, type OverallStatus } from '@/lib/health';

type Reading =
  | { kind: 'checking' }
  | { kind: 'ok' | 'degraded' | 'down'; report: HealthReport }
  | { kind: 'unreachable'; reason: string };

const TONE: Record<Reading['kind'], string> = {
  checking: 'text-muted',
  ok: 'text-status-ok',
  degraded: 'text-status-warn',
  down: 'text-status-down',
  unreachable: 'text-status-down',
};

const DOT: Record<Reading['kind'], string> = {
  checking: 'bg-line-strong',
  ok: 'bg-status-ok',
  degraded: 'bg-status-warn',
  down: 'bg-status-down',
  unreachable: 'bg-status-down',
};

/**
 * The live status line. CLAUDE.md 8.
 *
 * Every word it renders comes from GET /api/health. There is no branch in this
 * component that prints "Systems Nominal" without the endpoint having derived
 * `ok` from checks that all returned `ok` — and while Supabase is unconfigured
 * it cannot, so this currently reads as degraded, correctly.
 *
 * A failed fetch, a timeout, or a non-JSON body is itself a reading:
 * `unreachable`. Silence is not treated as health.
 *
 * Typographically this belongs to the systems-readout layer (4.6) — mono,
 * tracked caps — which is exactly the instrumentation the language is for.
 *
 * The reading settles in with a CSS animation keyed on the reading itself, so
 * a change is visible rather than a silent text mutation. It is CSS and not one
 * of the components/motion primitives on purpose: this sits in the footer of
 * every route, and chrome does not get to put an animation library in the
 * shared bundle (CLAUDE.md 6).
 */
export function StatusLine({
  endpoint = '/api/health',
  className,
  showDetail = true,
}: {
  endpoint?: string;
  className?: string;
  showDetail?: boolean;
}) {
  const [reading, setReading] = useState<Reading>({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    /**
     * The readout is real but it is not critical path, and on a mid-range
     * Android the last thing worth doing during hydration is opening a network
     * request for a status line below the fold. Wait for the main thread to go
     * idle first (with a ceiling, so it always resolves).
     */
    const run = async () => {
      timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const report = (await response.json()) as HealthReport;
        if (!report || typeof report.status !== 'string') {
          throw new Error('Malformed health report');
        }
        setReading({ kind: report.status as OverallStatus, report });
      } catch (error) {
        if (controller.signal.aborted) {
          setReading({ kind: 'unreachable', reason: 'Health check timed out after 6s' });
          return;
        }
        setReading({
          kind: 'unreachable',
          reason: error instanceof Error ? error.message : 'Health check failed',
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const handle = hasIdle
      ? window.requestIdleCallback(() => void run(), { timeout: 1500 })
      : window.setTimeout(() => void run(), 200);

    return () => {
      if (hasIdle) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
      clearTimeout(timeout);
      controller.abort();
    };
  }, [endpoint]);

  const label = STATUS_LABEL[reading.kind];

  const detail =
    reading.kind === 'unreachable'
      ? reading.reason
      : reading.kind === 'checking'
        ? null
        : Object.entries(reading.report.checks)
            .map(([name, check]) => `${name}: ${check.status}`)
            .join(' · ');

  return (
    <p
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}
      // The reading arrives after paint and can change again. Announce it,
      // politely, rather than letting it mutate silently.
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', DOT[reading.kind])}
        />
        {/* key remounts the node so the settle animation runs on each change */}
        <span key={reading.kind} className={cn('state-in readout', TONE[reading.kind])}>
          {label}
        </span>
      </span>
      {showDetail && detail ? (
        <>
          {/* The label and detail are separated visually by the flex gap, which
              contributes nothing to the accessible name — without this the live
              region announces "Partial Serviceweb: ok". */}
          <span className="sr-only">: </span>
          <Readout key={detail} className="state-in tracking-normal normal-case">
            {detail}
          </Readout>
        </>
      ) : null}
    </p>
  );
}
