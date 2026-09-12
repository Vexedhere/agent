'use client';

import ReactMarkdown from 'react-markdown';
import type { Message } from './types';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-white'
            : message.status === 'failed'
              ? 'border border-red-900/50 bg-red-950/30 text-red-200'
              : 'bg-surface-raised text-neutral-100'
        }`}
      >
        {message.status === 'failed' ? (
          <div>
            <p className="font-medium">This response failed.</p>
            {message.error && <p className="mt-1 text-xs opacity-80">{message.error}</p>}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content || (message.status === 'streaming' ? '…' : '')}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
