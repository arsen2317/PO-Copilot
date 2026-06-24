import { Link, Paperclip, Package, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDialogById } from '../../data/api/assistant';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';

interface Props {
  dialogId: string | undefined;
}

export default function ContextPanel({ dialogId }: Props) {
  const { data: dialog, isLoading } = useQuery({
    queryKey: ['dialog', dialogId],
    queryFn: () => (dialogId ? getDialogById(dialogId) : Promise.resolve(undefined)),
    enabled: !!dialogId,
  });

  if (!dialogId) return null;

  return (
    <div className="flex flex-col w-[260px] shrink-0 border-l border-border overflow-y-auto">
      <div className="px-4 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold">Контекст диалога</span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {/* Продукт */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Продукт</span>
            </div>
            <p className="text-[13px]">{dialog?.context.productName}</p>
            {dialog?.context.sprintName && (
              <Badge variant="secondary" className="mt-1 text-[11px]">
                {dialog.context.sprintName}
              </Badge>
            )}
          </div>

          {/* Связанная задача */}
          {dialog?.context.taskId && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Link className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Связанная задача</span>
                </div>
                <Badge variant="outline" className="cursor-pointer text-primary border-primary/40">
                  {dialog.context.taskId}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{dialog.context.taskTitle}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Участники */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Участники</span>
            </div>
            <div className="flex flex-col gap-2">
              {dialog?.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <Button variant="outline" size="sm" className="w-full gap-2">
            <Paperclip className="h-4 w-4" />
            Прикрепить артефакт
          </Button>
        </div>
      )}
    </div>
  );
}
