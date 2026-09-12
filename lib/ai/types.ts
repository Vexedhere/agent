/**
 * Provider-agnostic types for chat completions. Real providers (Anthropic
 * now; OpenAI-compatible / others later) implement AIProvider. Nothing in
 * app code should import an SDK directly — always go through getAIProvider().
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface StreamChatOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'done'; stopReason: string | null }
  | { type: 'error'; message: string };

export interface AIProvider {
  readonly id: string;
  readonly defaultModel: string;

  /** Async generator of stream events for a chat completion. */
  streamChat(
    messages: ChatMessageInput[],
    options?: StreamChatOptions
  ): AsyncGenerator<StreamEvent>;
}
