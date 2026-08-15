import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requirePublicEnv, serviceRoleKey } from '@/lib/env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Server Components cannot write cookies; the `setAll` failure there is expected
 * and safe to ignore because `middleware.ts` refreshes the session on every
 * request and writes the refreshed cookies itself.
 */
export async function createClient() {
  // Read cookies first: this marks the route dynamic before any configuration
  // check can throw, so a missing env var surfaces at request time rather than
  // failing `next build` while prerendering.
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware handles the refresh.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS entirely — only use in trusted server code
 * that has already resolved and checked the workspace (webhooks, admin tasks).
 */
export function createServiceClient() {
  const { supabaseUrl } = requirePublicEnv();
  return createServerClient(supabaseUrl, serviceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
