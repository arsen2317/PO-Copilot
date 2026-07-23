import { getToken } from '../features/auth/auth';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export type ContentBlock = TextBlock | ToolUseBlock;

export interface ChatOptions {
  messages: ChatMessage[];
  system?: string;
  tools?: object[];
  model?: string;
  onTextDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export interface ChatResult {
  blocks: ContentBlock[];
  stopReason: string;
}

export async function streamChat(options: ChatOptions): Promise<ChatResult> {
  const { messages, system, tools, model, onTextDelta, signal } = options;

  const token = getToken();
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ messages, system, tools, model }),
    ...(signal != null && { signal }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Track blocks by index
  const blocks: ContentBlock[] = [];
  const partialJson: Record<number, string> = {};
  let stopReason = 'end_turn';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(data) as Record<string, unknown>;
      } catch {
        continue;
      }

      const type = event.type as string;

      if (type === 'content_block_start') {
        const idx = event.index as number;
        const block = event.content_block as { type: string; id?: string; name?: string };
        if (block.type === 'tool_use') {
          blocks[idx] = { type: 'tool_use', id: block.id!, name: block.name!, input: {} };
          partialJson[idx] = '';
        } else if (block.type === 'text') {
          blocks[idx] = { type: 'text', text: '' };
        }
      }

      if (type === 'content_block_delta') {
        const idx = event.index as number;
        const delta = event.delta as { type: string; text?: string; partial_json?: string };

        if (delta.type === 'text_delta' && delta.text) {
          const b = blocks[idx] as TextBlock | undefined;
          if (b?.type === 'text') {
            b.text += delta.text;
            onTextDelta?.(delta.text);
          }
        }

        if (delta.type === 'input_json_delta' && delta.partial_json) {
          partialJson[idx] = (partialJson[idx] ?? '') + delta.partial_json;
        }
      }

      if (type === 'content_block_stop') {
        const idx = event.index as number;
        const b = blocks[idx] as ToolUseBlock | undefined;
        if (b?.type === 'tool_use' && partialJson[idx]) {
          try {
            b.input = JSON.parse(partialJson[idx]!) as Record<string, unknown>;
          } catch {
            // malformed JSON — leave input as {}
          }
        }
      }

      if (type === 'message_delta') {
        const delta = event.delta as { stop_reason?: string };
        if (delta.stop_reason) stopReason = delta.stop_reason;
      }

      if (type === 'error') {
        const err = event.error as { message?: string } | string;
        throw new Error(typeof err === 'string' ? err : (err.message ?? 'Stream error'));
      }
    }
  }

  return { blocks: blocks.filter(Boolean), stopReason };
}
