import { useNavigate } from 'react-router-dom';
import { Table, Tag, theme } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Task, TaskPriority } from '../../../data/types';
import { PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from '../taskConstants';
import { PriorityChevrons, UserAvatar } from '../TaskWidgets';

const { useToken } = theme;

// ─── List view ────────────────────────────────────────────────────────────────

export function ListView({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
  const { token } = useToken();
  const navigate = useNavigate();

  type Col = { title: React.ReactNode; key: string; width?: number; sorter?: (a: Task, b: Task) => number; render: (_: unknown, t: Task) => React.ReactNode };

  const columns: Col[] = [
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ID</span>,
      key: 'id', width: 90,
      sorter: (a, b) => a.id.localeCompare(b.id),
      render: (_, t) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: token.colorPrimary, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>{t.id}</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ЗАГОЛОВОК</span>,
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (_, t) => <span style={{ fontSize: 13, color: token.colorText, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>{t.title}</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>СТАТУС</span>,
      key: 'status', width: 130,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, t) => <Tag color={STATUS_COLOR[t.status]} style={{ fontSize: 11 }}>{STATUS_LABEL[t.status]}</Tag>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ИСПОЛНИТЕЛЬ</span>,
      key: 'assignee', width: 150,
      render: (_, t) => t.assignee
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><UserAvatar user={t.assignee} size={20} /><span style={{ fontSize: 12, color: token.colorText }}>{t.assignee.name.split(' ')[0]}</span></div>
        : <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ПРИОРИТЕТ</span>,
      key: 'priority', width: 120,
      sorter: (a, b) => { const o: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.priority] - o[b.priority]; },
      render: (_, t) => <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority={t.priority} /><span style={{ fontSize: 12, color: token.colorText }}>{PRIORITY_LABEL[t.priority]}</span></div>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>МЕТРИКИ</span>,
      key: 'metrics', width: 150,
      render: (_, t) => t.relatedMetricIds?.length
        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {t.relatedMetricIds.slice(0, 2).map((m) => <Tag key={m} style={{ fontSize: 10, padding: '0 5px', margin: 0, border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>{m}</Tag>)}
            {t.relatedMetricIds.length > 2 && <span style={{ fontSize: 11, color: token.colorTextTertiary }}>+{t.relatedMetricIds.length - 2}</span>}
          </div>
        : <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ВЛИЯНИЕ</span>,
      key: 'risk', width: 110,
      sorter: (a, b) => { const o: Record<string, number> = { critical: 0, warning: 1, ok: 2 }; return (o[a.riskLevel] ?? 3) - (o[b.riskLevel] ?? 3); },
      render: (_, t) => {
        const rc = t.riskLevel === 'critical' ? token.colorError : t.riskLevel === 'warning' ? token.colorWarning : token.colorSuccess;
        const label = t.riskLevel === 'critical' ? 'Критично' : t.riskLevel === 'warning' ? 'Высокое' : 'Низкое';
        return <span style={{ fontSize: 12, color: rc, border: t.riskLevel !== 'ok' ? `1px solid ${rc}` : undefined, borderRadius: 4, padding: t.riskLevel !== 'ok' ? '1px 7px' : undefined }}>{label}</span>;
      },
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ДЕДЛАЙН</span>,
      key: 'deadline', width: 110,
      sorter: (a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''),
      render: (_, t) => {
        if (!t.deadline) return <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>;
        const overdue = new Date(t.deadline) < new Date() && t.status !== 'done';
        return <span style={{ fontSize: 12, color: overdue ? token.colorError : token.colorText, display: 'flex', alignItems: 'center', gap: 4 }}><ClockCircleOutlined style={{ fontSize: 11 }} />{new Date(t.deadline).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>;
      },
    },
  ];

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 'max-content', y: 'calc(100vh - 260px)' }}
        style={{ minWidth: 700 }}
      />
    </div>
  );
}
