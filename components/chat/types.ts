export interface Conversation {
  id: string;
  title: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: MessageStatus;
  error?: string | null;
  model?: string | null;
  created_at: string;
}
