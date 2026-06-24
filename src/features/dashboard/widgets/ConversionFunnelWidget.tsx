import { Button, Card, Flex, Skeleton, Tag, theme, Tooltip, Typography } from 'antd';
import { CommentOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getFunnelSteps } from '../../../data/api/dashboard';
import type { FunnelStep } from '../../../data/types';

const { useToken } = theme;

function riskColor(step: FunnelStep, token: ReturnType<typeof useToken>['token']) {
  if (step.riskLevel === 'critical') return token.colorError;
  if (step.riskLevel === 'warning') return token.colorWarning;
  return token.colorSuccess;
}

function riskLabel(step: FunnelStep) {
  if (step.riskLevel === 'critical') return 'критично';
  if (step.riskLevel === 'warning') return 'под риском';
  return null;
}

export default function ConversionFunnelWidget() {
  const { token } = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['funnel'],
    queryFn: getFunnelSteps,
  });

  return (
    <Card
      title="Воронка конверсии"
      extra={
        <Tooltip title="Спросить ассистента">
          <Button type="text" size="small" icon={<CommentOutlined />} />
        </Tooltip>
      }
      styles={{ body: { padding: '12px 16px' } }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <Flex vertical gap={4}>
          {data?.map((step, idx) => {
            const color = riskColor(step, token);
            const label = riskLabel(step);
            const barWidth = step.value / 10000;

            return (
              <div key={step.id}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
                  <Flex align="center" gap={6}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 16 }}>
                      {idx + 1}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 13 }}>{step.name}</Typography.Text>
                    {label && (
                      <Tag
                        color={step.riskLevel === 'critical' ? 'error' : 'warning'}
                        icon={<WarningOutlined />}
                        style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
                      >
                        {label}
                      </Tag>
                    )}
                  </Flex>
                  <Flex align="center" gap={12}>
                    <Typography.Text
                      style={{ fontSize: 13, color, fontWeight: 600, minWidth: 36, textAlign: 'right' }}
                    >
                      {step.percent}%
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 52, textAlign: 'right' }}>
                      {step.value.toLocaleString('ru')}
                    </Typography.Text>
                  </Flex>
                </Flex>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: token.colorFillSecondary,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${barWidth * 100}%`,
                      background: color,
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}
