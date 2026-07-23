import { verifyToken } from './_lib/token';

export const config = { runtime: 'edge' };

const ALLOWED_MODELS = ['claude-haiku-4-5-20251001'];
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify session token
  const secret = process.env.APP_SESSION_SECRET;
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!secret || !token || !(await verifyToken(token, secret))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    messages: unknown[];
    system?: string;
    tools?: unknown[];
    model?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const model = ALLOWED_MODELS.includes(body.model ?? '')
    ? body.model!
    : 'claude-haiku-4-5-20251001';

  // Prompt caching: пометить стабильный system-промпт + инструменты как кэшируемые (зеркало dev-api-server).
  // Ниже минимальной длины кэша модели API молча игнорирует это — не ошибка.
  const cachedSystem = body.system
    ? [{ type: 'text', text: body.system, cache_control: { type: 'ephemeral' } }]
    : undefined;
  const cachedTools =
    body.tools && body.tools.length > 0
      ? body.tools.map((t, i) =>
          i === body.tools!.length - 1
            ? { ...(t as Record<string, unknown>), cache_control: { type: 'ephemeral' } }
            : t,
        )
      : undefined;

  // Call Anthropic API with streaming, pipe response directly to client
  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      ...(cachedSystem && { system: cachedSystem }),
      messages: body.messages,
      ...(cachedTools && { tools: cachedTools }),
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => 'Unknown error');
    return new Response(JSON.stringify({ error: text }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pipe Anthropic SSE stream directly to client
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
