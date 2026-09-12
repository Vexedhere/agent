import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/auth/callback', '/api/health'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const cookieDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options, domain: cookieDomain });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, domain: cookieDomain, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || 'https://try.sparkagent.in.net/login';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectTarget = new URL(loginUrl);
    redirectTarget.searchParams.set('next', appUrl + path);
    return NextResponse.redirect(redirectTarget);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
