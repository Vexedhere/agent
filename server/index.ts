import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { runAgent } from './agent/engine.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.CORS_ORIGIN ?? 'https://agent.sparkagent.in.net';
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

app.disable('x-powered-by');
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'sparkagent' }));

async function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data.user) return res.status(401).json({ error: 'Invalid session' });
  res.locals.userId = data.user.id;
  next();
}

app.post('/api/conversations', requireUser, async (req, res) => {
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 120) : 'New chat';
  const { data, error } = await supabase.from('conversations').insert({ user_id: res.locals.userId, title }).select().single();
  if (error) return res.status(500).json({ error: 'Unable to create conversation' });
  res.status(201).json(data);
});

app.get('/api/conversations', requireUser, async (_req, res) => {
  const { data, error } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Unable to load conversations' });
  res.json(data);
});

app.get('/api/conversations/:id/messages', requireUser, async (req, res) => {
  const { data: conversation } = await supabase.from('conversations').select('id').eq('id', req.params.id).eq('user_id', res.locals.userId).maybeSingle();
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', req.params.id).eq('user_id', res.locals.userId).order('created_at');
  if (error) return res.status(500).json({ error: 'Unable to load messages' });
  res.json(data);
});

app.post('/api/agent/run', requireUser, async (req, res) => {
  const { conversationId, message } = req.body ?? {};
  if (typeof conversationId !== 'string' || typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'conversationId and message are required' });
  const { data: conversation } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', res.locals.userId).maybeSingle();
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const runId = randomUUID();
  await supabase.from('agent_runs').insert({ id: runId, user_id: res.locals.userId, conversation_id: conversationId, state: 'thinking' });
  await supabase.from('messages').insert({ conversation_id: conversationId, user_id: res.locals.userId, role: 'user', content: message.trim(), status: 'completed' });

  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive');
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  let answer = '';
  for await (const event of runAgent({ userId: res.locals.userId, conversationId, message: message.trim() }, controller.signal)) {
    send(event);
    if (event.type === 'delta') answer += event.text ?? '';
    if (event.type === 'state') await supabase.from('agent_runs').update({ state: event.state }).eq('id', runId).eq('user_id', res.locals.userId);
  }
  if (answer) await supabase.from('messages').insert({ conversation_id: conversationId, user_id: res.locals.userId, role: 'assistant', content: answer, status: 'completed' });
  await supabase.from('agent_runs').update({ completed_at: new Date().toISOString() }).eq('id', runId).eq('user_id', res.locals.userId);
  res.end();
});

app.listen(port, () => console.log(`SparkAgent API listening on ${port}`));
