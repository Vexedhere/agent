'use client';

import { useState } from 'react';
import type { Conversation } from './types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  userEmail: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}

export function Sidebar({
  conversations,
  activeId,
  userEmail,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onTogglePin,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  const startRename = (c: Conversation) => {
    setRenamingId(c.id);
    setRenameValue(c.title);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-border bg-surface-raised">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="h-7 w-7 rounded-md bg-accent" />
        <span className="font-semibold tracking-tight">SparkAgent</span>
      </div>

      <div className="px-3">
        <button
          onClick={onNewChat}
          className="mb-3 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-left text-sm font-medium text-neutral-100 transition hover:border-accent"
        >
          + New chat
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="mb-3 w-full rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500 focus:border-accent"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-xs text-neutral-500">No chats yet.</p>
        )}
        <ul className="space-y-0.5">
          {filtered.map((c) => (
            <li key={c.id}>
              <div
                className={`group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
                  activeId === c.id ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                {renamingId === c.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={(e) => e.key === 'Enter' && commitRename(c.id)}
                    className="flex-1 bg-transparent outline-none"
                  />
                ) : (
                  <button
                    onClick={() => onSelect(c.id)}
                    className="flex-1 truncate text-left"
                    title={c.title}
                  >
                    {c.is_pinned && <span className="mr-1">📌</span>}
                    {c.title}
                  </button>
                )}

                <div className="hidden gap-1 group-hover:flex">
                  <button
                    onClick={() => onTogglePin(c.id, !c.is_pinned)}
                    title={c.is_pinned ? 'Unpin' : 'Pin'}
                    className="rounded px-1 text-xs text-neutral-400 hover:text-neutral-100"
                  >
                    📌
                  </button>
                  <button
                    onClick={() => startRename(c)}
                    title="Rename"
                    className="rounded px-1 text-xs text-neutral-400 hover:text-neutral-100"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    title="Delete"
                    className="rounded px-1 text-xs text-neutral-400 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-surface-border px-4 py-3 text-xs text-neutral-400">
        {userEmail}
      </div>
    </aside>
  );
}
