export interface ChatMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; }
export interface ChatOptions { model: string; messages: ChatMessage[]; signal?: AbortSignal; }
export interface AIProvider { chat(options: ChatOptions): AsyncGenerator<string>; }

export class OpenAICompatibleProvider implements AIProvider {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async *chat(options: ChatOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: options.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: options.model, messages: options.messages, stream: true })
    });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
    if (!response.body) throw new Error('AI provider returned no stream');
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim(); if (data === '[DONE]') return;
          try { const token = JSON.parse(data).choices?.[0]?.delta?.content; if (token) yield token; } catch { /* ignore malformed SSE frames */ }
        }
      }
    } finally { reader.releaseLock(); }
  }
}
