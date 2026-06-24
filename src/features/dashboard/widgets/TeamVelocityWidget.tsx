import { useQuery } from '@tanstack/react-query';
import { getSprintMetric } from '../../../data/api/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

export default function TeamVelocityWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['sprint-metric'],
    queryFn: getSprintMetric,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Скорость команды</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pointPercent = Math.round((data.completedPoints / data.totalPoints) * 100);
  const dayPercent = Math.round((data.daysElapsed / data.daysTotal) * 100);
  const isAhead = pointPercent >= dayPercent;
  const statusClass = isAhead ? 'text-success' : 'text-warning';
  const progressClass = isAhead ? 'bg-success' : 'bg-warning';
  const remainingPoints = data.totalPoints - data.completedPoints;
  const remainingDays = data.daysTotal - data.daysElapsed;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <CardTitle>Скорость команды</CardTitle>
        <span className="text-xs text-muted-foreground font-normal">{data.sprintName}</span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted-foreground">Выполнено сторипоинтов</span>
              <span className={cn('text-xs font-semibold', statusClass)}>
                {data.completedPoints} / {data.totalPoints} SP
              </span>
            </div>
            <Progress value={pointPercent} indicatorClassName={progressClass} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted-foreground">Прогресс по времени</span>
              <span className="text-xs">День {data.daysElapsed} / {data.daysTotal}</span>
            </div>
            <Progress value={dayPercent} indicatorClassName="bg-muted-foreground" />
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Осталось SP</p>
              <p className="text-xl font-bold">{remainingPoints}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Осталось дней</p>
              <p className="text-xl font-bold">{remainingDays}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Прогноз завершения</p>
              <p className={cn('text-base font-semibold', statusClass)}>
                {new Date(data.forecastDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
