import type Anthropic from '@anthropic-ai/sdk';
import { getToken } from '../features/auth/auth';

export type ChatMessage = Anthropic.MessageParam;
export type Tool = Anthropic.Tool;
export type ContentBlock = Anthropic.ContentBlock;

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export interface ChatOptions {
  messages: ChatMessage[];
  system?: string;
  tools?: Tool[];
  model?: string;
  onEvent?: (event: StreamEvent) => void;
  signal?: AbortSignal;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextDelta {
  type: 'text_delta';
  text: string;
}

/**
 * Stream a chat completion through our /api/chat proxy.
 * Calls onEvent for each SSE event; resolves with the full assistant content
 * after any tool-use rounds are complete.
 */
export async function streamChat(options: ChatOptions): Promise<ContentBlock[]> {
  const { messages, system, tools, model, onEvent, signal } = options;

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
  const contentBlocks: ContentBlock[] = [];
  let currentText = '';
  let stopReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;

      let event: StreamEvent;
      try {
        event = JSON.parse(data) as StreamEvent;
      } catch {
        continue;
      }

      onEvent?.(event);

      if (event.type === 'content_block_start') {
        const block = (event as unknown as { content_block: ContentBlock }).content_block;
        if (block.type === 'tool_use') contentBlocks.push(block);
        if (block.type === 'text') currentText = '';
      }

      if (event.type === 'content_block_delta') {
        const delta = (event as unknown as { delta: TextDelta }).delta;
        if (delta.type === 'text_delta') currentText += delta.text;
      }

      if (event.type === 'content_block_stop' && currentText) {
        contentBlocks.push({ type: 'text', text: currentText } as ContentBlock);
        currentText = '';
      }

      if (event.type === 'message_delta') {
        const d = event as unknown as { delta: { stop_reason?: string } };
        stopReason = d.delta.stop_reason ?? null;
      }

      if (event.type === 'error') {
        throw new Error((event as unknown as { error: string }).error);
      }
    }
  }

  if (currentText) {
    contentBlocks.push({ type: 'text', text: currentText } as ContentBlock);
  }

  void stopReason;
  return contentBlocks;
}
