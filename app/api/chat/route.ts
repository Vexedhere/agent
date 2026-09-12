import { type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 * Body: { conversationId: string, content: string }
 *
 * Persists the user's message immediately, streams the assistant's reply
 * back to the client as Server-Sent Events, and persists the final
 * assistant message (or an honest failure record) when the stream ends.
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated.' }), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const conversationId = body?.conversationId as string | undefined;
  const content = (body?.content as string | undefined)?.trim();

  if (!conversationId || !content) {
    return new Response(
      JSON.stringify({ error: 'conversationId and content are required.' }),
      { status: 400 }
    );
  }

  // Verify the conversation belongs to this user (RLS also enforces this,
  // but we check explicitly so we can return a clean 404 instead of a
  // confusing empty insert).
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (convError || !conversation) {
    return new Response(JSON.stringify({ error: 'Conversation not found.' }), { status: 404 });
  }

  // Persist the user's message before calling the model.
  const { error: userMsgError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content,
    status: 'completed',
  });

  if (userMsgError) {
    return new Response(JSON.stringify({ error: userMsgError.message }), { status: 500 });
  }

  // Pull recent history for context.
  const { data: history, error: historyError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (historyError) {
    return new Response(JSON.stringify({ error: historyError.message }), { status: 500 });
  }

  let provider;
  try {
    provider = getAIProvider();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI provider is not configured.';
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'assistant',
      content: '',
      status: 'failed',
      error: message,
    });
    return new Response(JSON.stringify({ error: message }), { status: 503 });
  }

  const encoder = new TextEncoder();
  let fullText = '';
  let streamFailed: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const chunk of provider.streamChat(
          history!.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
          { maxTokens: 4096 }
        )) {
          if (chunk.type === 'text_delta') {
            fullText += chunk.text;
            send('delta', { text: chunk.text });
          } else if (chunk.type === 'error') {
            streamFailed = chunk.message;
            send('error', { message: chunk.message });
          } else if (chunk.type === 'done') {
            send('done', { stopReason: chunk.stopReason });
          }
        }
      } catch (err) {
        streamFailed = err instanceof Error ? err.message : 'Unexpected streaming error.';
        send('error', { message: streamFailed });
      }

      // Persist the outcome honestly — never claim success on failure.
      if (streamFailed) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: fullText, // keep whatever partial text was generated, clearly marked failed
          status: 'failed',
          error: streamFailed,
        });
      } else {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: fullText,
          status: 'completed',
          model: provider.defaultModel,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
