'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import type { Conversation, Message } from './types';

interface WorkspaceProps {
  userEmail: string;
  initialConversations: Conversation[];
}

type AgentState = 'idle' | 'thinking' | 'streaming' | 'failed';

export function Workspace({ userEmail, initialConversations }: WorkspaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (id: string) => {
    setLoadError(null);
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) {
      setLoadError('Could not load this conversation.');
      setMessages([]);
      return;
    }
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    if (activeId) loadConversation(activeId);
    else setMessages([]);
  }, [activeId, loadConversation]);

  const refreshConversationList = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
  }, []);

  const handleNewChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New chat' }),
    });
    if (!res.ok) {
      setLoadError('Could not create a new chat.');
      return;
    }
    const data = await res.json();
    setConversations((prev) => [data.conversation, ...prev]);
    setActiveId(data.conversation.id);
    setMessages([]);
  };

  const handleRename = async (id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  };

  const handleDelete = async (id: string) => {
    const prev = conversations;
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setConversations(prev); // roll back optimistic delete on real failure
      setLoadError('Could not delete that chat.');
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, is_pinned: pinned } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: pinned }),
    });
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setAgentState('idle');
  };

  const handleSend = async (text: string) => {
    let conversationId = activeId;

    // Create a conversation on first message if none is active yet.
    if (!conversationId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 48) }),
      });
      if (!res.ok) {
        setLoadError('Could not start a new chat.');
        return;
      }
      const data = await res.json();
      conversationId = data.conversation.id;
      setConversations((prev) => [data.conversation, ...prev]);
      setActiveId(conversationId);
    }

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    const assistantPlaceholder: Message = {
      id: `local-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      status: 'streaming',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setAgentState('thinking');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'The request failed.' }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPlaceholder.id
              ? { ...m, status: 'failed', error: err.error || 'The request failed.' }
              : m
          )
        );
        setAgentState('failed');
        return;
      }

      setAgentState('streaming');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          const eventLine = raw.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;
          const eventType = eventLine.replace('event: ', '');
          const data = JSON.parse(dataLine.replace('data: ', ''));

          if (eventType === 'delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholder.id ? { ...m, content: m.content + data.text } : m
              )
            );
          } else if (eventType === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholder.id ? { ...m, status: 'failed', error: data.message } : m
              )
            );
            setAgentState('failed');
          } else if (eventType === 'done') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantPlaceholder.id ? { ...m, status: 'completed' } : m))
            );
          }
        }
      }

      setAgentState('idle');
      refreshConversationList();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPlaceholder.id
              ? { ...m, status: 'failed', error: 'Connection lost while streaming.' }
              : m
          )
        );
      }
      setAgentState('idle');
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        userEmail={userEmail}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
      />

      <main className="flex flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-surface-border px-4 text-sm text-neutral-400">
          <span>
            {agentState === 'thinking' && 'Thinking…'}
            {agentState === 'streaming' && 'Responding…'}
            {agentState === 'failed' && 'Something went wrong.'}
            {agentState === 'idle' && '\u00A0'}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {loadError && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {loadError}
              </p>
            )}
            {messages.length === 0 && !loadError && (
              <p className="mt-20 text-center text-sm text-neutral-500">
                Tell SparkAgent what you want to get done.
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        </div>

        <Composer onSend={handleSend} isStreaming={agentState === 'streaming' || agentState === 'thinking'} onStop={handleStop} />
      </main>
    </div>
  );
}
