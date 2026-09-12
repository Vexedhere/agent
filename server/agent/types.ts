export type AgentState = 'idle' | 'thinking' | 'planning' | 'executing' | 'waiting_for_tool' | 'waiting_for_user' | 'waiting_for_confirmation' | 'completed' | 'failed' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ToolPermission = 'read' | 'write' | 'external';

export interface ToolDefinition<I = unknown, O = unknown> {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  permissions: ToolPermission[];
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  execute(input: I, ctx: ToolContext): Promise<O>;
}

export interface ToolContext { userId: string; runId: string; signal?: AbortSignal; }
export interface AgentEvent { type: 'state' | 'status' | 'tool' | 'delta' | 'error' | 'done'; state?: AgentState; text?: string; toolId?: string; }
export interface AgentRequest { userId: string; conversationId: string; message: string; }
