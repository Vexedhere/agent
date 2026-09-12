import type { AIProvider } from './types';
import { AnthropicProvider } from './providers/anthropic';

let cachedProvider: AIProvider | null = null;

/**
 * Returns the configured AIProvider based on AI_PROVIDER env var.
 * Server-only — never import this from a Client Component.
 */
export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerId = process.env.AI_PROVIDER || 'anthropic';

  switch (providerId) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'AI_PROVIDER is set to "anthropic" but ANTHROPIC_API_KEY is not configured.'
        );
      }
      cachedProvider = new AnthropicProvider(apiKey, process.env.ANTHROPIC_MODEL);
      return cachedProvider;
    }
    // Future providers register here, e.g.:
    // case 'openai': return new OpenAIProvider(...)
    default:
      throw new Error(`Unknown AI_PROVIDER "${providerId}". Set it in your environment.`);
  }
}

export type { AIProvider, ChatMessageInput, StreamChatOptions, StreamEvent } from './types';
