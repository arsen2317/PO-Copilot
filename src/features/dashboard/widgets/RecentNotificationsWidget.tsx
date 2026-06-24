import { AlertTriangle, Bot, ChevronRight, MessageCircle, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../../../data/api/notifications';
import type { Notification, NotificationType } from '../../../data/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; label: string }> = {
  incident: { icon: <AlertTriangle className="h-4 w-4" />, label: 'Инцидент' },
  agent: { icon: <Bot className="h-4 w-4" />, label: 'Агент' },
  mention: { icon: <MessageCircle className="h-4 w-4" />, label: 'Упоминание' },
  'service-result': { icon: <Star className="h-4 w-4" />, label: 'Сервис' },
};

function NotificationItem({ item }: { item: Notification }) {
  const meta = TYPE_META[item.type];
  const timeLabel = new Date(item.time).toLocaleString('ru', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="relative mt-0.5 shrink-0">
        <span className="text-muted-foreground">{meta.icon}</span>
        {!item.isRead && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] truncate', item.isRead ? 'font-normal' : 'font-semibold')}>
          {item.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {meta.label} · {timeLabel}
        </p>
      </div>
    </div>
  );
}

export default function RecentNotificationsWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const recent = data?.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle>Последние уведомления</CardTitle>
        <Button
          variant="link"
          size="sm"
          className="gap-1 p-0 h-auto text-xs"
          onClick={() => void navigate('/notifications')}
        >
          Все уведомления
          <ChevronRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div>
            {(recent ?? []).map((item) => (
              <NotificationItem key={item.id} item={item} />
            ))}
            {(recent ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет уведомлений</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
