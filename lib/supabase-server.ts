import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The service-role Supabase client. SERVER ONLY.
 *
 * `import 'server-only'` is the enforcement, not the comment: if any client
 * component ever imports this file, even transitively, the build fails rather
 * than quietly shipping the service-role key to the browser. The key is also
 * deliberately read from a variable with no NEXT_PUBLIC_ prefix, so Next will
 * not inline it into a client bundle even if something goes wrong here.
 *
 * The service role bypasses row-level security, which is exactly why nothing
 * but the route handler may hold it. The submissions table has RLS on and no
 * policies, so anon and authenticated are denied both read and write; this
 * client is the only path in.
 */
export type SupabaseConfigState =
  | { configured: true; client: SupabaseClient }
  | { configured: false; reason: string };

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseConfigState {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    // Empty and unset are both "not configured" — see lib/site.ts for why that
    // distinction has bitten this project before.
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean);
    return { configured: false, reason: `${missing.join(' and ')} not set.` };
  }

  cached ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'sarva-tech-web' } },
  });

  return { configured: true, client: cached };
}
