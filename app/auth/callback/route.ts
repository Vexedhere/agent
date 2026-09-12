import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * If try.sparkagent.in.net redirects here with a `code` param (e.g. after
 * a magic link or OAuth flow that targets this app directly), exchange it
 * for a session. In the common case, login happens entirely on
 * try.sparkagent.in.net and this route is never hit — the shared cookie
 * domain is what makes the session visible here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(next.startsWith('http') ? next : `${origin}${next}`);
}
