import React, { useEffect, useRef } from 'react';
import { Bot, Mic, Send, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDialogById } from '../../data/api/assistant';
import type { Message } from '../../data/types';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../lib/utils';

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAssistant = msg.role === 'assistant';

  return (
    <div className={cn('flex gap-2.5 mb-4', isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[72%]', isAssistant ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed',
            isAssistant
              ? 'bg-primary/10 border border-primary/20'
              : 'bg-card border border-border',
          )}
        >
          {msg.content.split('\n').map((line, i) => (
            <span key={i} className="block">
              {line ? parseBold(line) : <>&nbsp;</>}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">{formatTime(msg.time)}</span>
      </div>

      {!isAssistant && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

interface Props {
  dialogId: string | undefined;
}

export default function MessageFeed({ dialogId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: dialog, isLoading } = useQuery({
    queryKey: ['dialog', dialogId],
    queryFn: () => (dialogId ? getDialogById(dialogId) : Promise.resolve(undefined)),
    enabled: !!dialogId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialog?.messages]);

  if (!dialogId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Bot className="h-12 w-12 opacity-40" />
        <p className="text-sm">Выберите диалог или начните новый</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="flex items-center px-5 py-3 border-b border-border shrink-0">
        {isLoading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <span className="font-semibold text-sm">{dialog?.title}</span>
        )}
      </div>

      {/* Лента */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <>
            {dialog?.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Ввод */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border shrink-0">
        <Textarea
          placeholder="Напишите сообщение... (/ — команды, @ — упоминания)"
          className="flex-1 resize-none min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Голосовой ввод</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Отправить</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
