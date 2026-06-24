import { Button, Col, Flex, Row, Select, Skeleton, theme, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../data/api/dashboard';
import ConversionFunnelWidget from './widgets/ConversionFunnelWidget';
import IncidentsWidget from './widgets/IncidentsWidget';
import NpsTrendWidget from './widgets/NpsTrendWidget';
import RecentNotificationsWidget from './widgets/RecentNotificationsWidget';
import TeamVelocityWidget from './widgets/TeamVelocityWidget';

const { useToken } = theme;

export default function DashboardPage() {
  const { token } = useToken();
  const [productId, setProductId] = useState('p1');

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  return (
    <Flex vertical gap={20}>
      {/* Шапка: переключатель продукта + кнопка добавления виджета */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Flex align="center" gap={12}>
          <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            Продукт:
          </Typography.Text>
          {productsLoading ? (
            <Skeleton.Input active style={{ width: 200 }} size="small" />
          ) : (
            <Select
              value={productId}
              onChange={setProductId}
              style={{ minWidth: 220 }}
              options={(products ?? []).map((p) => ({
                value: p.id,
                label: (
                  <Flex vertical gap={0}>
                    <span>{p.name}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {p.team}
                    </Typography.Text>
                  </Flex>
                ),
              }))}
            />
          )}
        </Flex>
        <Button
          icon={<PlusOutlined />}
          style={{ color: token.colorTextSecondary }}
        >
          Добавить виджет
        </Button>
      </Flex>

      {/* Сетка виджетов */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ConversionFunnelWidget />
        </Col>
        <Col xs={24} lg={12}>
          <NpsTrendWidget />
        </Col>
        <Col xs={24} lg={12}>
          <TeamVelocityWidget />
        </Col>
        <Col xs={24} lg={12}>
          <IncidentsWidget />
        </Col>
        <Col xs={24}>
          <RecentNotificationsWidget />
        </Col>
      </Row>
    </Flex>
  );
}
