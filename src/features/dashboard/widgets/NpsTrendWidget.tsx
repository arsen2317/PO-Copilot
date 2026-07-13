import { Card, Flex, Skeleton, Statistic, theme, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getNpsHistory } from '../../../data/api/dashboard';
import type { NpsPoint } from '../../../data/types';

const { useToken } = theme;

function Sparkline({ data, color }: { data: number[]; color: string }) {
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
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function npsTrend(data: NpsPoint[]) {
  if (data.length < 8) return 0;
  return (data.at(-1)?.nps ?? 0) - (data.at(-8)?.nps ?? 0);
}

export default function NpsTrendWidget() {
  const { token } = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['nps-history'],
    queryFn: getNpsHistory,
  });

  const current = data?.at(-1);
  const trend = data ? npsTrend(data) : 0;
  const trendColor = trend >= 0 ? token.colorSuccess : token.colorError;

  return (
    <Card title="Динамика NPS и обращений" styles={{ body: { padding: '12px 16px' } }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : (
        <Flex vertical gap={12}>
          <Flex gap={32}>
            <Statistic
              title="NPS (сегодня)"
              value={current?.nps ?? 0}
              valueStyle={{ color: trendColor, fontSize: 28 }}
              prefix={trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix={
                <Typography.Text style={{ fontSize: 13, color: trendColor }}>
                  {trend > 0 ? `+${trend}` : trend} за 7 дней
                </Typography.Text>
              }
            />
            <Statistic
              title="Обращений в поддержку"
              value={current?.tickets ?? 0}
              valueStyle={{ fontSize: 28 }}
              suffix="/ день"
            />
          </Flex>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              NPS · 30 дней
            </Typography.Text>
            {data && <Sparkline data={data.map((d) => d.nps)} color={token.colorPrimary} />}
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Обращения · 30 дней
            </Typography.Text>
            {data && <Sparkline data={data.map((d) => d.tickets)} color={token.colorWarning} />}
          </div>
        </Flex>
      )}
    </Card>
  );
}
