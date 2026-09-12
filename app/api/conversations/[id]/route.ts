import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Params {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, title, is_pinned, is_archived, created_at, updated_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, content, status, error, model, created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ conversation, messages });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
  if (typeof body.is_pinned === 'boolean') updates.is_pinned = body.is_pinned;
  if (typeof body.is_archived === 'boolean') updates.is_archived = body.is_archived;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, title, is_pinned, is_archived, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
