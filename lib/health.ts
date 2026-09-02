/**
 * Shared shape for GET /api/health. CLAUDE.md 8: the status readout is real.
 *
 * The rule that matters here: nothing in this file may report a state it has
 * not actually observed. Supabase is not wired until S5, so it reports
 * `not_configured` — not `ok`, and not silently omitted.
 */

export type CheckStatus = 'ok' | 'not_configured' | 'degraded' | 'down';
export type OverallStatus = 'ok' | 'degraded' | 'down';

export type HealthCheck = {
  status: CheckStatus;
  /** Plain-language detail. Says what is true, and what happens next. */
  detail: string;
  latencyMs?: number;
};

export type HealthReport = {
  status: OverallStatus;
  timestamp: string;
  uptimeSeconds: number;
  build: {
    commit: string | null;
    branch: string | null;
    env: string;
    region: string | null;
    builtAt: string | null;
  };
  checks: Record<string, HealthCheck>;
};

/**
 * Overall state is derived from the checks, never asserted.
 * Any check down takes the whole report down; anything short of `ok`
 * degrades it. There is no code path that returns `ok` without every
 * check having returned `ok`.
 */
export function deriveOverall(checks: Record<string, HealthCheck>): OverallStatus {
  const statuses = Object.values(checks).map((check) => check.status);
  if (statuses.includes('down')) return 'down';
  if (statuses.some((status) => status !== 'ok')) return 'degraded';
  return 'ok';
}

/** Copy for the status line, per overall state. Tracked caps, 4.6. */
export const STATUS_LABEL: Record<OverallStatus | 'checking' | 'unreachable', string> = {
  ok: 'Systems Nominal',
  degraded: 'Partial Service',
  down: 'Service Down',
  checking: 'Querying',
  unreachable: 'Readout Unreachable',
};
