import { ArrowDown, ArrowUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getNpsHistory } from '../../../data/api/dashboard';
import type { NpsPoint } from '../../../data/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="block">
      <polyline
        points={pts}
        fill="none"
        className={colorClass}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function npsTrend(data: NpsPoint[]) {
  if (data.length < 8) return 0;
  return (data.at(-1)?.nps ?? 0) - (data.at(-8)?.nps ?? 0);
}

export default function NpsTrendWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['nps-history'],
    queryFn: getNpsHistory,
  });

  const current = data?.at(-1);
  const trend = data ? npsTrend(data) : 0;
  const trendPositive = trend >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Динамика NPS и обращений</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground mb-1">NPS (сегодня)</p>
                <div
                  className={cn(
                    'flex items-center gap-1 text-2xl font-bold',
                    trendPositive ? 'text-success' : 'text-destructive',
                  )}
                >
                  {trendPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                  {current?.nps ?? 0}
                  <span className="text-sm font-normal ml-1">
                    {trend > 0 ? `+${trend}` : trend} за 7 дней
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Обращений в поддержку</p>
                <div className="text-2xl font-bold">
                  {current?.tickets ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ день</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-muted-foreground mb-1">NPS · 30 дней</p>
              {data && <Sparkline data={data.map((d) => d.nps)} colorClass="stroke-primary" />}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Обращения · 30 дней</p>
              {data && <Sparkline data={data.map((d) => d.tickets)} colorClass="stroke-warning" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
