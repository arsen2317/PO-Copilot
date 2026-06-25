import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { signToken, verifyToken } from '../api/_lib/token';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

// ── Auth endpoint ────────────────────────────────────────────────────────────
app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const validLogin = process.env.APP_LOGIN;
  const validPassword = process.env.APP_PASSWORD;
  const secret = process.env.APP_SESSION_SECRET;

  if (!validLogin || !validPassword || !secret) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  if (username !== validLogin || password !== validPassword) {
    await new Promise((r) => setTimeout(r, 300));
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = await signToken(username, secret);
  res.json({ token });
});

// ── Chat endpoint ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const secret = process.env.APP_SESSION_SECRET;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!secret || !token || !(await verifyToken(token, secret))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env.local' });
    return;
  }

  const ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];
  const { messages, system, tools, model: reqModel } = req.body as {
    messages: Anthropic.MessageParam[];
    system?: string;
    tools?: Anthropic.Tool[];
    model?: string;
  };

  const model = ALLOWED_MODELS.includes(reqModel ?? '') ? reqModel! : 'claude-haiku-4-5-20251001';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const client = new Anthropic({ apiKey });

  try {
    const stream = await client.messages.stream({ model, max_tokens: 4096, system, messages, tools });
    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stream error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(3001, () => {
  console.log('[dev-api] listening on http://localhost:3001');
});
