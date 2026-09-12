import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('archived') === 'true';

  let query = supabase
    .from('conversations')
    .select('id, title, is_pinned, is_archived, created_at, updated_at')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'New chat';

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title })
    .select('id, title, is_pinned, is_archived, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
