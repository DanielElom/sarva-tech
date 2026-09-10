import { NextResponse } from 'next/server';
import { deriveOverall, type HealthCheck, type HealthReport } from '@/lib/health';
import { getServiceClient } from '@/lib/supabase-server';

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

/**
 * A real round trip, not a configuration check.
 *
 * It counts rows in the submissions table with the service role, which is the
 * same path a submission takes: if this succeeds, storing a lead will too. A
 * probe that only asked "are the variables set?" would report ok while the
 * database was unreachable, which is the failure CLAUDE.md 8 exists to prevent.
 *
 * The timeout matters as much as the query. Without it an unreachable database
 * hangs the health endpoint instead of reporting that it is unreachable.
 */
async function checkSupabase(): Promise<HealthCheck> {
  const supabase = getServiceClient();
  if (!supabase.configured) {
    return { status: 'not_configured', detail: supabase.reason };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const { error } = await supabase.client
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .abortSignal(controller.signal);

    if (error) {
      return {
        status: 'down',
        detail: `Query against submissions failed: ${error.message}`,
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      status: 'ok',
      detail: 'Queried the submissions table with the service role.',
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: 'down',
      detail:
        controller.signal.aborted
          ? 'Supabase did not answer within 4s.'
          : `Supabase probe threw: ${error instanceof Error ? error.message : 'unknown'}`,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
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
    supabase: await checkSupabase(),
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
