import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the auth cookie with a shared domain so
 * a session created on try.sparkagent.in.net (login) is visible here on
 * agent.sparkagent.in.net.
 *
 * Requires NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.sparkagent.in.net in production.
 * The *same* cookie domain must be configured on try.sparkagent.in.net or
 * SSO will not work — each subdomain will set its own isolated cookie.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const cookieDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              domain: cookieDomain,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          } catch {
            // Called from a Server Component without a mutable cookie store.
            // Safe to ignore: middleware handles the actual refresh/write.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
              domain: cookieDomain,
              maxAge: 0,
            });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

/**
 * Service-role client for privileged server-only operations (e.g. writing
 * audit logs, admin tasks). NEVER import this into anything that runs in
 * the browser, and never return this client or its key from an API route.
 */
export function createSupabaseServiceRoleClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
