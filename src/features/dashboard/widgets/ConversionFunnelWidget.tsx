import { MessageSquare, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFunnelSteps } from '../../../data/api/dashboard';
import type { FunnelStep } from '../../../data/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { cn } from '../../../lib/utils';

function riskVariant(step: FunnelStep): 'destructive' | 'warning' | 'success' {
  if (step.riskLevel === 'critical') return 'destructive';
  if (step.riskLevel === 'warning') return 'warning';
  return 'success';
}

function riskBarClass(step: FunnelStep) {
  if (step.riskLevel === 'critical') return 'bg-destructive';
  if (step.riskLevel === 'warning') return 'bg-warning';
  return 'bg-success';
}

function riskTextClass(step: FunnelStep) {
  if (step.riskLevel === 'critical') return 'text-destructive';
  if (step.riskLevel === 'warning') return 'text-warning';
  return 'text-success';
}

function riskLabel(step: FunnelStep) {
  if (step.riskLevel === 'critical') return 'критично';
  if (step.riskLevel === 'warning') return 'под риском';
  return null;
}

export default function ConversionFunnelWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['funnel'],
    queryFn: getFunnelSteps,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle>Воронка конверсии</CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Спросить ассистента</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.map((step, idx) => {
              const label = riskLabel(step);
              const barWidth = step.value / 10000;

              return (
                <div key={step.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                      <span className="text-[13px]">{step.name}</span>
                      {label && (
                        <Badge variant={riskVariant(step)} className="gap-1 text-[10px] py-0 h-[18px]">
                          <TriangleAlert className="h-3 w-3" />
                          {label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-[13px] font-semibold min-w-[36px] text-right', riskTextClass(step))}>
                        {step.percent}%
                      </span>
                      <span className="text-xs text-muted-foreground min-w-[52px] text-right">
                        {step.value.toLocaleString('ru')}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-500', riskBarClass(step))}
                      style={{ width: `${barWidth * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
