import { NextResponse } from 'next/server';
import { deriveOverall, type HealthCheck, type HealthReport } from '@/lib/health';

/**
 * GET /api/health — CLAUDE.md 8.
 *
 * Real state only. A developer visitor will check this, and a fake readout on a
 * site arguing that Sarva Tech knows how to build is a puncture in exactly the
 * wrong place.
 *
 * Supabase lands in S5. Until then this reports `not_configured` and the
 * overall status derives to `degraded`. That is the honest answer, and the
 * status line in the UI shows it as such.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const startedAt = Date.now();

function checkSupabase(): HealthCheck {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      status: 'not_configured',
      detail: 'Supabase credentials are not set. Intake storage is wired in S5.',
    };
  }

  // Deliberately not reachable yet: with no project provisioned there is
  // nothing to probe, and a probe that always passes is worse than no probe.
  // S5 replaces this branch with a real round trip against the intake table.
  return {
    status: 'degraded',
    detail: 'Credentials present but the connection probe is not implemented until S5.',
  };
}

export async function GET(request: Request) {
  const receivedAt = Date.now();

  /**
   * `?simulate=` lets the failure states be demonstrated and tested without
   * breaking anything. It can only ever make the report worse — there is no
   * value that reports healthier than reality.
   */
  const simulate = new URL(request.url).searchParams.get('simulate');

  const checks: Record<string, HealthCheck> = {
    web: {
      status: 'ok',
      detail: 'Route handler responded.',
      latencyMs: Date.now() - receivedAt,
    },
    supabase: checkSupabase(),
  };

  if (simulate === 'down') {
    checks.web = { status: 'down', detail: 'Simulated outage (?simulate=down).' };
  } else if (simulate === 'degraded') {
    checks.web = { status: 'degraded', detail: 'Simulated degradation (?simulate=degraded).' };
  }

  const report: HealthReport = {
    status: deriveOverall(checks),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    build: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      region: process.env.VERCEL_REGION ?? null,
      builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
    },
    checks,
  };

  return NextResponse.json(report, {
    // 503 when down so uptime monitors and curl agree with the readout.
    status: report.status === 'down' ? 503 : 200,
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
