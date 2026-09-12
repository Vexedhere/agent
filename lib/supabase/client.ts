'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. Cookie domain must match the server client's
 * so the session set here is readable by middleware and server components,
 * and so it's shared with try.sparkagent.in.net.
 */
export function createSupabaseBrowserClient() {
  const cookieDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain,
        sameSite: 'lax',
        secure: true,
      },
    }
  );
}
