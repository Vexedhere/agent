import { OpenAICompatibleProvider } from '../ai/provider.js';
import type { AgentEvent, AgentRequest } from './types.js';

const SYSTEM = `You are SparkAgent, a production AI agent. Understand requests, plan briefly, use only available tools, and never claim an action happened unless it actually succeeded. Do not reveal chain-of-thought; provide concise status summaries. Consequential external actions require explicit confirmation.`;

export async function* runAgent(request: AgentRequest, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    yield { type: 'state', state: 'failed' };
    yield { type: 'error', text: 'AI provider is not configured on the server.' };
    return;
  }

  const provider = new OpenAICompatibleProvider(baseUrl, apiKey);
  yield { type: 'state', state: 'thinking' };
  yield { type: 'status', text: 'Planning your request…' };
  yield { type: 'state', state: 'planning' };

  let output = '';
  try {
    yield { type: 'state', state: 'executing' };
    for await (const token of provider.chat({ model, signal, messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: request.message }
    ] })) {
      output += token;
      yield { type: 'delta', text: token };
    }
    if (!output) throw new Error('AI provider returned an empty response');
    yield { type: 'state', state: 'completed' };
    yield { type: 'done' };
  } catch (error) {
    yield { type: 'state', state: 'failed' };
    yield { type: 'error', text: error instanceof Error ? error.message : 'AI request failed.' };
  }
}
