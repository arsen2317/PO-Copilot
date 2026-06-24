import { Card, Flex, Progress, Skeleton, Statistic, theme, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getSprintMetric } from '../../../data/api/dashboard';

const { useToken } = theme;

export default function TeamVelocityWidget() {
  const { token } = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['sprint-metric'],
    queryFn: getSprintMetric,
  });

  if (isLoading) {
    return (
      <Card title="Скорость команды" styles={{ body: { padding: '12px 16px' } }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!data) return null;

  const pointPercent = Math.round((data.completedPoints / data.totalPoints) * 100);
  const dayPercent = Math.round((data.daysElapsed / data.daysTotal) * 100);
  const isAhead = pointPercent >= dayPercent;
  const statusColor = isAhead ? token.colorSuccess : token.colorWarning;
  const remainingPoints = data.totalPoints - data.completedPoints;
  const remainingDays = data.daysTotal - data.daysElapsed;

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          Скорость команды
          <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 400 }}>
            {data.sprintName}
          </Typography.Text>
        </Flex>
      }
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Flex vertical gap={16}>
        <div>
          <Flex justify="space-between" style={{ marginBottom: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Выполнено сторипоинтов
            </Typography.Text>
            <Typography.Text style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>
              {data.completedPoints} / {data.totalPoints} SP
            </Typography.Text>
          </Flex>
          <Progress
            percent={pointPercent}
            strokeColor={statusColor}
            trailColor={token.colorFillSecondary}
            showInfo={false}
            size="small"
          />
        </div>

        <div>
          <Flex justify="space-between" style={{ marginBottom: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Прогресс по времени
            </Typography.Text>
            <Typography.Text style={{ fontSize: 12 }}>
              День {data.daysElapsed} / {data.daysTotal}
            </Typography.Text>
          </Flex>
          <Progress
            percent={dayPercent}
            strokeColor={token.colorFillTertiary}
            trailColor={token.colorFillSecondary}
            showInfo={false}
            size="small"
          />
        </div>

        <Flex gap={24}>
          <Statistic
            title="Осталось SP"
            value={remainingPoints}
            valueStyle={{ fontSize: 22 }}
          />
          <Statistic
            title="Осталось дней"
            value={remainingDays}
            valueStyle={{ fontSize: 22 }}
          />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Прогноз завершения
            </Typography.Text>
            <Typography.Text
              style={{ display: 'block', fontSize: 15, fontWeight: 600, color: statusColor }}
            >
              {new Date(data.forecastDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
            </Typography.Text>
          </div>
        </Flex>
      </Flex>
    </Card>
  );
}
