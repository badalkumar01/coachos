import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / email-confirmation landing route. Exchanges the code for a session,
 * then sends the user on to onboarding (which is idempotent — it forwards to
 * the dashboard if the workspace is already set up).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const destination = next?.startsWith('/') ? next : '/onboarding';

  if (!code) {
    const url = new URL('/sign-in', origin);
    url.searchParams.set('error', 'That sign-in link is missing its code. Try again.');
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL('/sign-in', origin);
    url.searchParams.set('error', 'That sign-in link has expired. Request a new one.');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(destination, origin));
}
