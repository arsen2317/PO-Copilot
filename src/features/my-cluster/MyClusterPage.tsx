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
  const [productId, setProductId] = useState<string>('all');
  const [productCode, setProductCode] = useState<string>('all');
  const [monthId, setMonthId] = useState<string>('2026-06');

  const { data, isLoading } = useQuery({
    queryKey: ['my-cluster'],
    queryFn: getMyClusterData,
  });

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  const realProducts = (data?.products ?? []).filter((r) => !r.isTotal);

  // ── Фильтры (кластер один; стрим/продукт/код режут таблицу) ──
  const clusterMenu: MenuProps = { items: [{ key: 'daily', label: 'Дэйли Бэнкинг' }] };

  const streamName =
    streamId === 'all' ? 'Все стримы' : data?.streams.find((s) => s.id === streamId)?.name ?? 'Все стримы';
  const streamMenu: MenuProps = {
    items: [
      { key: 'all', label: 'Все стримы' },
      ...(data?.streams ?? []).map((s) => ({ key: s.id, label: s.name })),
    ],
    onClick: ({ key }) => setStreamId(key),
  };

  const productName =
    productId === 'all' ? 'Все продукты' : realProducts.find((p) => p.id === productId)?.product ?? 'Все продукты';
  const productMenu: MenuProps = {
    items: [
      { key: 'all', label: 'Все продукты' },
      ...realProducts.map((p) => ({ key: p.id, label: p.product })),
    ],
    onClick: ({ key }) => setProductId(key),
  };

  const codeLabel = productCode === 'all' ? 'Код продукта' : productCode;
  const codeMenu: MenuProps = {
    items: [
      { key: 'all', label: 'Все коды' },
      ...realProducts.map((p) => ({ key: p.code, label: p.code })),
    ],
    onClick: ({ key }) => setProductCode(key),
  };

  const monthName = data?.months.find((m) => m.id === monthId)?.name ?? 'Июнь';
  const monthMenu: MenuProps = {
    items: (data?.months ?? []).map((m) => ({ key: m.id, label: m.name })),
    onClick: ({ key }) => setMonthId(key),
  };

  const groups = data?.groupsByMonth[monthId] ?? [];

  const hasFilter = streamId !== 'all' || productId !== 'all' || productCode !== 'all';
  // Итоговая строка честна только без фильтров.
  const productRows = (data?.products ?? []).filter((r) => {
    if (r.isTotal) return !hasFilter;
    if (streamId !== 'all' && r.streamId !== streamId) return false;
    if (productId !== 'all' && r.id !== productId) return false;
    if (productCode !== 'all' && r.code !== productCode) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Typography.Title
          level={3}
          style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}
        >
          Кластер
        </Typography.Title>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20, flexShrink: 0 }}>
        <Dropdown menu={clusterMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">Дэйли Бэнкинг</Button>
        </Dropdown>
        <Dropdown menu={streamMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">{streamName}</Button>
        </Dropdown>
        <Dropdown menu={productMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">{productName}</Button>
        </Dropdown>
        <Dropdown menu={codeMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">{codeLabel}</Button>
        </Dropdown>
        <Dropdown menu={monthMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">Месяц: {monthName}</Button>
        </Dropdown>
      </div>

      {/* ── KPI groups ──
          Раскладка групп и тайлов — адаптивная, через container queries
          (.cluster-groups* в global.css): классы групп завязаны на g.id. */}
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
        <div className="cluster-groups-wrap" style={{ marginBottom: 16, flexShrink: 0 }}>
          <div className="cluster-groups">
            {groups.map((g) => (
              <div key={g.id} className={`cluster-group--${g.id}`} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: token.colorText, marginBottom: 8 }}>
                  {g.title}
                </div>
                <div className="cluster-group-tiles">
                  {g.kpis.map((k) => (
                    <ClusterKpiTile key={k.id} kpi={k} />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
