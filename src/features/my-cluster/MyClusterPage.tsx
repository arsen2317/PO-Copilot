import { Button, Select, Skeleton, theme, Typography } from 'antd';
import { BookOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyClusterData } from '../../data/api/my-cluster';
import type { ClusterKpiGroup } from '../../data/types';
import StatusKpiCard from './components/StatusKpiCard';
import StructurePanel from './components/StructurePanel';
import ProductsTable from './components/ProductsTable';

const { useToken } = theme;

// Мок-опции фильтров (Фаза 1 — статичный экран на моках, без реальной фильтрации).
const STREAM_OPTS = [
  { value: 'all', label: 'Все' },
  { value: 'debit', label: 'Дебетовые карты' },
  { value: 'pay', label: 'Платежи и переводы' },
  { value: 'proc', label: 'Платёжные технологии' },
];
const PRODUCT_OPTS = [{ value: 'all', label: 'Все' }];
const CODE_OPTS = [{ value: 'all', label: 'Все' }];

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  const { token } = useToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: token.colorTextTertiary }}>{label}</span>
      {children}
    </div>
  );
}

/** Заголовок группы KPI-карточек. */
function GroupBlock({ group }: { group: ClusterKpiGroup }) {
  const { token } = useToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: token.colorTextTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {group.title}
      </div>
      {group.kpis.length > 0 ? (
        group.kpis.map((k) => <StatusKpiCard key={k.id} kpi={k} />)
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '16px 18px',
            background: token.colorBgContainer,
            border: `1px dashed ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            color: token.colorTextTertiary,
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {group.note}
        </div>
      )}
    </div>
  );
}

export default function MyClusterPage() {
  const { token } = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['my-cluster'],
    queryFn: getMyClusterData,
  });

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Заголовок ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}>
            Мой кластер
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {data?.clusterName ?? 'Сводка кластера'} — финансы, клиенты и производство одним экраном
          </Typography.Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {data && (
            <div style={{ textAlign: 'right', fontSize: 11, color: token.colorTextTertiary, lineHeight: 1.5 }}>
              <div>Финансы и клиенты — на {data.financialPeriod}</div>
              <div>Производство — на {data.productionPeriod}</div>
            </div>
          )}
          <Button icon={<BookOutlined />}>Методика</Button>
        </div>
      </div>

      {/* ── Панель фильтров ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
          padding: '12px 14px',
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <Filter label="Кластер">
          <Select value="daily" style={{ width: 220 }} options={[{ value: 'daily', label: 'Кластер Дэйли Бэнкинг' }]} />
        </Filter>
        <Filter label="Стрим">
          <Select defaultValue="all" style={{ width: 190 }} options={STREAM_OPTS} />
        </Filter>
        <Filter label="Продукт">
          <Select defaultValue="all" style={{ width: 150 }} options={PRODUCT_OPTS} />
        </Filter>
        <Filter label="Код продукта">
          <Select defaultValue="all" style={{ width: 140 }} options={CODE_OPTS} />
        </Filter>
        <Filter label="Данные с начала года по месяц">
          <Select value={data?.financialPeriod ?? '2026-06'} style={{ width: 140 }} options={[{ value: data?.financialPeriod ?? '2026-06', label: data?.financialPeriod ?? '2026-06' }]} />
        </Filter>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: token.colorTextTertiary, fontSize: 12 }}>
          <ReloadOutlined style={{ fontSize: 12 }} />
          Обновлено 14 мин назад
        </div>
      </div>

      {/* ── Структура + группы метрик ── */}
      {isLoading || !data ? (
        <div style={{ padding: 24, background: token.colorBgContainer, border: BDR, borderRadius: token.borderRadiusLG, marginBottom: 12 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(230px, 260px) 1fr',
            gap: 12,
            marginBottom: 12,
            alignItems: 'start',
          }}
        >
          <StructurePanel structure={data.structure} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(278px, 1fr))',
              gap: 16,
              alignItems: 'start',
            }}
          >
            {data.groups.map((g) => (
              <GroupBlock key={g.id} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* ── Разрез по продуктам ── */}
      <div
        style={{
          flexShrink: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px 4px', fontSize: 13, fontWeight: 600, color: token.colorText }}>
          Разрез по продуктам
        </div>
        {isLoading || !data ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <ProductsTable rows={data.products} />
        )}
      </div>
    </div>
  );
}
