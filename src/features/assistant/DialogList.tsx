import { Link, MessageSquare, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDialogs } from '../../data/api/assistant';
import type { Dialog, DialogType } from '../../data/types';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../lib/utils';
import { Users } from 'lucide-react';

const TYPE_ICON: Record<DialogType, React.ReactNode> = {
  personal: <MessageSquare className="h-4 w-4" />,
  group: <Users className="h-4 w-4" />,
  task: <Link className="h-4 w-4" />,
};

interface Props {
  activeId: string | undefined;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function DialogItem({ dialog, active }: { dialog: Dialog; active: boolean }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => void navigate(`/assistant/${dialog.id}`)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors border-l-2',
        'hover:bg-accent',
        active
          ? 'bg-primary/10 border-primary'
          : 'border-transparent',
      )}
    >
      <div className="relative shrink-0 mt-0.5">
        <span className={cn('text-muted-foreground', active && 'text-foreground')}>
          {TYPE_ICON[dialog.type]}
        </span>
        {dialog.unread > 0 && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {dialog.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn('text-[13px] truncate', dialog.unread ? 'font-semibold' : 'font-normal')}>
            {dialog.title}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{timeLabel(dialog.time)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{dialog.lastMessage}</p>
      </div>
    </button>
  );
}

function DialogListContent({ items, isLoading }: { items: Dialog[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Нет диалогов</p>;
  }
  return <div>{items.map((d) => <DialogItem key={d.id} dialog={d} active={false} />)}</div>;
}

export default function DialogList({ activeId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ['dialogs'], queryFn: getDialogs });

  const personal = data?.filter((d) => d.type === 'personal') ?? [];
  const groups = data?.filter((d) => d.type === 'group') ?? [];
  const tasks = data?.filter((d) => d.type === 'task') ?? [];

  return (
    <div className="flex flex-col w-[280px] shrink-0 border-r border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">Диалоги</span>
        <Button size="sm" className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Новый
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger value="personal" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">
              Личные
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">
              Группы
            </TabsTrigger>
            <TabsTrigger value="task" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">
              Задачи
            </TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-0">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div>
                {personal.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Нет диалогов</p>
                ) : (
                  personal.map((d) => <DialogItem key={d.id} dialog={d} active={d.id === activeId} />)
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="group" className="mt-0">
            <DialogListContent items={groups} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="task" className="mt-0">
            <DialogListContent items={tasks} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
