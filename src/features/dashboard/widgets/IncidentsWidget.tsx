import { Button, Card, Flex, List, Skeleton, theme, Typography } from 'antd';
import { ExclamationCircleFilled, WarningFilled } from '../../../components/icons';
import { useQuery } from '@tanstack/react-query';
import { getIncidents } from '../../../data/api/dashboard';
import type { Incident } from '../../../data/types';

const { useToken } = theme;

function IncidentItem({ incident }: { incident: Incident }) {
  const { token } = useToken();
  const isCritical = incident.severity === 'critical';
  const color = isCritical ? token.colorError : token.colorWarning;
  const Icon = isCritical ? ExclamationCircleFilled : WarningFilled;

  const timeLabel = new Date(incident.time).toLocaleString('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <List.Item
      style={{
        padding: '10px 12px',
        borderRadius: token.borderRadius,
        background: token.colorFillQuaternary,
        marginBottom: 8,
        border: `1px solid ${color}33`,
      }}
      actions={[
        <Button key="details" type="link" size="small" style={{ padding: 0, color: token.colorTextSecondary }}>
          Подробнее
        </Button>,
      ]}
    >
      <List.Item.Meta
        avatar={<Icon style={{ fontSize: 18, color, marginTop: 2 }} />}
        title={
          <Typography.Text style={{ fontSize: 13, fontWeight: 600, color }}>
            {incident.title}
          </Typography.Text>
        }
        description={
          <Flex vertical gap={2}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {incident.description}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {timeLabel}
            </Typography.Text>
          </Flex>
        }
      />
    </List.Item>
  );
}

export default function IncidentsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: getIncidents,
  });

  const criticalCount = data?.filter((i) => i.severity === 'critical').length ?? 0;
  const { token } = useToken();

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          Активные инциденты
          {criticalCount > 0 && (
            <Typography.Text style={{ fontSize: 12, color: token.colorError }}>
              {criticalCount} критичных
            </Typography.Text>
          )}
        </Flex>
      }
      styles={{ body: { padding: '12px 16px' } }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <List
          dataSource={data ?? []}
          renderItem={(incident) => <IncidentItem incident={incident} />}
          locale={{ emptyText: 'Нет активных инцидентов' }}
        />
      )}
    </Card>
  );
}
