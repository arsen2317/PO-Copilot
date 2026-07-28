import { theme, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ClusterProductRow } from '../../../data/types';

const { useToken } = theme;

const nf = new Intl.NumberFormat('ru-RU');

function fmtInt(v: number | null): string {
  return v === null ? '—' : nf.format(v);
}

function fmtPct(v: number | null): string {
  return v === null ? '—' : `${v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/** Разрез по продуктам кластера. Широкая таблица со скроллом по горизонтали. */
export default function ProductsTable({ rows }: { rows: ClusterProductRow[] }) {
  const { token } = useToken();

  const muted = { color: token.colorTextTertiary };

  /** Ячейка «% выполнения» с цветом статуса по порогам. */
  const fulfilCell = (v: number | null) => {
    if (v === null) return <span style={muted}>—</span>;
    const color =
      v >= 100 ? token.colorSuccess : v >= 80 ? token.colorWarning : token.colorError;
    return <span style={{ color, fontWeight: 600 }}>{fmtPct(v)}</span>;
  };

  const num = (v: number | null) => <span style={v === null ? muted : undefined}>{fmtInt(v)}</span>;
  const pct = (v: number | null) => <span style={v === null ? muted : undefined}>{fmtPct(v)}</span>;

  const columns: ColumnsType<ClusterProductRow> = [
    {
      title: 'Продукт',
      dataIndex: 'product',
      fixed: 'left',
      width: 210,
      render: (val: string, row) => (
        <span style={{ fontWeight: row.isTotal ? 700 : 500, color: token.colorText }}>{val}</span>
      ),
    },
    { title: 'Код', dataIndex: 'code', width: 92, render: (v: string) => <span style={muted}>{v}</span> },

    { title: 'ФинРез, факт ₽', dataIndex: 'finFact', align: 'right', width: 150, render: num },
    { title: 'ФинРез, бюджет ₽', dataIndex: 'finBudget', align: 'right', width: 150, render: num },
    { title: 'ФинРез вып., %', dataIndex: 'finFulfil', align: 'right', width: 120, render: fulfilCell },

    { title: 'CTI, факт %', dataIndex: 'ctiFact', align: 'right', width: 110, render: pct },
    { title: 'CTI, бюджет %', dataIndex: 'ctiBudget', align: 'right', width: 118, render: pct },
    { title: 'CTI вып., %', dataIndex: 'ctiFulfil', align: 'right', width: 108, render: fulfilCell },

    { title: 'Активные', dataIndex: 'active', align: 'right', width: 108, render: num },
    { title: 'Приток', dataIndex: 'inflow', align: 'right', width: 96, render: num },
    { title: 'Реактивация', dataIndex: 'reactive', align: 'right', width: 112, render: num },
    { title: 'Отток', dataIndex: 'churn', align: 'right', width: 96, render: num },

    { title: 'CR, %', dataIndex: 'crPct', align: 'right', width: 84, render: pct },
    { title: 'ABS', dataIndex: 'abs', align: 'right', width: 72, render: num },
    { title: 'Sec debt 1H', dataIndex: 'secDebt1H', align: 'right', width: 108, render: pct },
    { title: 'Sec debt 2H', dataIndex: 'secDebt2H', align: 'right', width: 108, render: pct },

    { title: 'Lead Time', dataIndex: 'leadTime', align: 'right', width: 100, render: (v: number | null) => (v === null ? <span style={muted}>—</span> : v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) },
    { title: 'DF', dataIndex: 'df', align: 'right', width: 68, render: num },
    { title: 'CFR', dataIndex: 'cfr', align: 'right', width: 84, render: pct },
    { title: 'MTTR', dataIndex: 'mttr', width: 96, render: (v: string) => <span style={muted}>{v}</span> },
  ];

  return (
    <Table<ClusterProductRow>
      size="small"
      pagination={false}
      dataSource={rows}
      columns={columns}
      rowKey="id"
      scroll={{ x: 'max-content' }}
      style={{ fontSize: 12 }}
      rowClassName={(row) => (row.isTotal ? 'cluster-total-row' : '')}
    />
  );
}
