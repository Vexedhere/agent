'use client';

import { useState, type KeyboardEvent } from 'react';

interface ComposerProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export function Composer({ onSend, isStreaming, onStop, disabled }: ComposerProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim() || isStreaming || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-surface-border bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-surface-border bg-surface-raised px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message SparkAgent…"
          rows={1}
          disabled={disabled}
          className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-neutral-500 disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-600"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-neutral-500">
        SparkAgent will always ask for confirmation before sending emails, pushing code, or other
        consequential actions.
      </p>
    </div>
  );
}
