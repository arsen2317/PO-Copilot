import { AlertCircle, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getIncidents } from '../../../data/api/dashboard';
import type { Incident } from '../../../data/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

function IncidentItem({ incident }: { incident: Incident }) {
  const isCritical = incident.severity === 'critical';
  const colorClass = isCritical ? 'text-destructive' : 'text-warning';
  const borderClass = isCritical ? 'border-destructive/30' : 'border-warning/30';
  const Icon = isCritical ? AlertCircle : TriangleAlert;

  const timeLabel = new Date(incident.time).toLocaleString('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border p-3 mb-2 bg-muted/30',
        borderClass,
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', colorClass)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-semibold', colorClass)}>{incident.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{incident.description}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{timeLabel}</p>
      </div>
      <Button variant="link" size="sm" className="text-muted-foreground h-auto p-0 text-xs shrink-0">
        Подробнее
      </Button>
    </div>
  );
}

export default function IncidentsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: getIncidents,
  });

  const criticalCount = data?.filter((i) => i.severity === 'critical').length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-3">
        <CardTitle>Активные инциденты</CardTitle>
        {criticalCount > 0 && (
          <span className="text-xs text-destructive">{criticalCount} критичных</span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div>
            {(data ?? []).map((incident) => (
              <IncidentItem key={incident.id} incident={incident} />
            ))}
            {(data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет активных инцидентов</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
