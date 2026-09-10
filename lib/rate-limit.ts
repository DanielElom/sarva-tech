/**
 * Rate limiting by IP (CLAUDE.md 9).
 *
 * In-memory and per-instance. That is a real limitation and worth stating: on
 * Vercel a burst spread across several lambda instances gets a higher effective
 * ceiling than the number below suggests. It is not the last line of defence —
 * validation, the honeypot and the database constraints are — it is there to
 * stop one script hammering the endpoint, and for that a per-instance counter
 * is enough. A shared store is the S6 conversation if the traffic warrants it.
 *
 * Entries are swept on write rather than on a timer, so nothing keeps the
 * process awake and the map cannot grow without bound.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;

type Hit = { count: number; firstAt: number };

const hits = new Map<string, Hit>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. For the Retry-After header. */
  retryAfter: number;
};

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  for (const [existing, hit] of hits) {
    if (now - hit.firstAt > WINDOW_MS) hits.delete(existing);
  }

  const hit = hits.get(key);
  if (!hit || now - hit.firstAt > WINDOW_MS) {
    hits.set(key, { count: 1, firstAt: now });
    return { allowed: true, remaining: MAX_IN_WINDOW - 1, retryAfter: 0 };
  }

  hit.count += 1;
  const retryAfter = Math.ceil((WINDOW_MS - (now - hit.firstAt)) / 1000);
  if (hit.count > MAX_IN_WINDOW) {
    return { allowed: false, remaining: 0, retryAfter };
  }
  return { allowed: true, remaining: MAX_IN_WINDOW - hit.count, retryAfter };
}

/** Only for tests — the limiter is process-global by design. */
export function resetRateLimit() {
  hits.clear();
}

export const RATE_LIMIT = { WINDOW_MS, MAX_IN_WINDOW } as const;

/**
 * Vercel puts the client address in x-forwarded-for, leftmost entry. Falling
 * back to a constant means an unknown client shares one bucket, which is the
 * safe direction: it throttles rather than exempts.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || headers.get('x-real-ip')?.trim() || 'unknown';
}
