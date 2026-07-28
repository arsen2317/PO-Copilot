import { useState } from 'react';
import { Button, Dropdown, Skeleton, theme, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyClusterData } from '../../data/api/my-cluster';
import ClusterKpiTile from './components/ClusterKpiTile';
import ProductsTable from './components/ProductsTable';

const { useToken } = theme;

export default function MyClusterPage() {
  const { token } = useToken();
  const [streamId, setStreamId] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-cluster'],
    queryFn: getMyClusterData,
  });

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  const streamName =
    streamId === 'all'
      ? 'Все стримы'
      : data?.streams.find((s) => s.id === streamId)?.name ?? 'Все стримы';

  const streamMenu: MenuProps = {
    items: [
      { key: 'all', label: 'Все стримы' },
      ...(data?.streams ?? []).map((s) => ({ key: s.id, label: s.name })),
    ],
    onClick: ({ key }) => setStreamId(key),
  };

  const groups = data?.groupsByStream[streamId] ?? data?.groupsByStream['all'] ?? [];
  // Итоговая строка честна только для всего кластера — при фильтре по стриму скрываем.
  const productRows = (data?.products ?? []).filter((r) =>
    streamId === 'all' ? true : r.streamId === streamId,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Typography.Title
          level={3}
          style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}
        >
          Кластер: Дэйли Бэнкинг
        </Typography.Title>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <Dropdown menu={streamMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">
            {streamName}
          </Button>
        </Dropdown>
      </div>

      {/* ── KPI groups ── */}
      {isLoading || !data ? (
        <div
          style={{
            padding: 24,
            background: token.colorBgContainer,
            border: BDR,
            borderRadius: token.borderRadiusLG,
            marginBottom: 12,
          }}
        >
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                flex: '1 1 330px',
                background: token.colorBgContainer,
                border: BDR,
                borderRadius: token.borderRadiusLG,
                padding: '12px 16px 16px',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: token.colorText, marginBottom: 10 }}>
                {g.title}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {g.kpis.map((k) => (
                  <ClusterKpiTile key={k.id} kpi={k} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Products breakdown table ── */}
      <div
        style={{
          flexShrink: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        {isLoading || !data ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <ProductsTable rows={productRows} />
        )}
      </div>
    </div>
  );
}
