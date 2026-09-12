import type { ToolDefinition } from './types.js';

const calculator: ToolDefinition<{ expression: string }, { result: number }> = {
  id: 'calculator', name: 'Calculator', description: 'Evaluate a basic arithmetic expression.',
  inputSchema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
  permissions: ['read'], riskLevel: 'low', requiresConfirmation: false,
  async execute({ expression }) {
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) throw new Error('Unsafe calculator expression');
    const result = Function(`"use strict"; return (${expression})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Invalid result');
    return { result };
  }
};

export const toolRegistry = new Map<string, ToolDefinition>([[calculator.id, calculator]]);
export function getTool(id: string) { return toolRegistry.get(id); }
