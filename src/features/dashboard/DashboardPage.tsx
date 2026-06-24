import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../data/api/dashboard';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import ConversionFunnelWidget from './widgets/ConversionFunnelWidget';
import IncidentsWidget from './widgets/IncidentsWidget';
import NpsTrendWidget from './widgets/NpsTrendWidget';
import RecentNotificationsWidget from './widgets/RecentNotificationsWidget';
import TeamVelocityWidget from './widgets/TeamVelocityWidget';

export default function DashboardPage() {
  const [productId, setProductId] = useState('p1');

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Продукт:</span>
          {productsLoading ? (
            <Skeleton className="h-10 w-52" />
          ) : (
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.team}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Добавить виджет
        </Button>
      </div>

      {/* Сетка виджетов */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConversionFunnelWidget />
        <NpsTrendWidget />
        <TeamVelocityWidget />
        <IncidentsWidget />
        <div className="lg:col-span-2">
          <RecentNotificationsWidget />
        </div>
      </div>
    </div>
  );
}
