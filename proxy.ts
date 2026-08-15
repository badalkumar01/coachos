import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 * Runs before every rendered route: refreshes the Supabase session cookie and
 * gates the authenticated route groups.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Webhook routes are
     * excluded too — they authenticate by signature, not by session cookie.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
