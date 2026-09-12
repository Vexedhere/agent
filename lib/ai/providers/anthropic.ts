import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatMessageInput, StreamChatOptions, StreamEvent } from '../types';

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly defaultModel: string;
  private client: Anthropic;

  constructor(apiKey: string, defaultModel = 'claude-sonnet-4-6') {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
    }
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  async *streamChat(
    messages: ChatMessageInput[],
    options: StreamChatOptions = {}
  ): AsyncGenerator<StreamEvent> {
    const { model, system, maxTokens = 4096, temperature, signal } = options;

    // Anthropic's API takes system prompt separately from the message list.
    const conversational = messages.filter((m) => m.role !== 'system');
    const systemFromMessages = messages.find((m) => m.role === 'system')?.content;

    try {
      const stream = this.client.messages.stream(
        {
          model: model || this.defaultModel,
          max_tokens: maxTokens,
          temperature,
          system: system || systemFromMessages,
          messages: conversational.map((m) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          })),
        },
        { signal }
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'text_delta', text: event.delta.text };
        }
        if (event.type === 'message_delta') {
          yield { type: 'done', stopReason: event.delta.stop_reason ?? null };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error from Anthropic API.';
      yield { type: 'error', message };
    }
  }
}
