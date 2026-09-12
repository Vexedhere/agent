import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Workspace } from '@/components/chat/Workspace';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated visitors, but this is a
  // real, independent check — never trust a single layer for auth.
  if (!user) {
    const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || 'https://try.sparkagent.in.net/login';
    redirect(loginUrl);
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, is_pinned, is_archived, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  return (
    <Workspace
      userEmail={user.email ?? ''}
      initialConversations={conversations ?? []}
    />
  );
}
