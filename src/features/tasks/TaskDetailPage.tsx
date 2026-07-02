import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Skeleton,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTaskById } from '../../data/api/tasks';
import type { TaskPriority, TaskStatus } from '../../data/types';

const { useToken } = theme;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Бэклог',
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На ревью',
  done: 'Готово',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const TABS = [
  { id: 'description', label: 'Описание', icon: <FileTextOutlined /> },
  { id: 'criteria', label: 'Критерии', icon: <CheckCircleOutlined /> },
  { id: 'compliance', label: 'Compliance', icon: <SafetyCertificateOutlined /> },
  { id: 'discussion', label: 'Обсуждение', icon: <TeamOutlined /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16',
};

function UserAvatar({ user, size = 28 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />;
  }
  return (
    <Avatar size={size} style={{ background: AVATAR_COLORS[user.id] ?? '#1668dc', fontSize: size * 0.42, fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </Avatar>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { token } = useToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      <span style={{ fontSize: 13, color: token.colorText }}>{children}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('description');
  const BDR = `1px solid ${token.colorBorderSecondary}`;

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId ?? ''),
    enabled: !!taskId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: 40, color: token.colorTextTertiary, textAlign: 'center' }}>
        Задача не найдена
      </div>
    );
  }

  const priorityColor =
    task.priority === 'critical' ? token.colorError
    : task.priority === 'high' ? token.colorWarning
    : task.priority === 'medium' ? token.colorPrimary
    : token.colorTextQuaternary;

  const riskColor =
    task.riskLevel === 'critical' ? token.colorError
    : task.riskLevel === 'warning' ? token.colorWarning
    : token.colorSuccess;

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  const completedCriteria = (task.criteria ?? []).filter((c) => c.done).length;
  const totalCriteria = (task.criteria ?? []).length;
  const passedCompliance = (task.compliance ?? []).filter((c) => c.passed).length;
  const totalCompliance = (task.compliance ?? []).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* ── Back + header ── */}
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          size="small"
          style={{ color: token.colorTextTertiary, fontSize: 13, padding: '0 4px', marginBottom: 12 }}
          onClick={() => navigate(-1)}
        >
          Задачи
        </Button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary, fontFamily: 'monospace' }}>{task.id}</span>
              <Tag
                style={{
                  fontSize: 11,
                  padding: '0 8px',
                  margin: 0,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: '#1e1f22',
                  color: token.colorText,
                }}
              >
                {STATUS_LABEL[task.status]}
              </Tag>
              {task.labels?.map((l) => (
                <Tag key={l} style={{ fontSize: 11, padding: '0 6px', margin: 0, border: BDR, background: 'transparent', color: token.colorTextSecondary }}>
                  {l}
                </Tag>
              ))}
            </div>
            <Typography.Title level={3} style={{ margin: 0, fontSize: 20, color: token.colorText, lineHeight: 1.3 }}>
              {task.title}
            </Typography.Title>
          </div>
          <Tooltip title="Копировать ссылку">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary, flexShrink: 0 }}>
              <LinkOutlined style={{ fontSize: 15 }} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* ── Body: main + sidebar ── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Left: tabs + content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: BDR, marginBottom: 20 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    color: isActive ? token.colorPrimary : token.colorTextTertiary,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: -1,
                    transition: 'color 0.15s',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'criteria' && totalCriteria > 0 && (
                    <Badge
                      count={`${completedCriteria}/${totalCriteria}`}
                      style={{ background: completedCriteria === totalCriteria ? token.colorSuccess : '#2D2E30', boxShadow: 'none', fontSize: 10 }}
                    />
                  )}
                  {tab.id === 'compliance' && totalCompliance > 0 && (
                    <Badge
                      count={`${passedCompliance}/${totalCompliance}`}
                      style={{ background: passedCompliance === totalCompliance ? token.colorSuccess : token.colorWarning, boxShadow: 'none', fontSize: 10 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div>

            {/* ── Description ── */}
            {activeTab === 'description' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: task.description ? token.colorText : token.colorTextTertiary,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {task.description ?? 'Описание не добавлено.'}
                </div>

                {/* Artifacts */}
                {(task.artifacts ?? []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Связанные артефакты
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {task.artifacts!.map((a, i) => {
                        const iconMap = { pr: '⎇', figma: '◈', confluence: '📄', metric: '📊' } as const;
                        return (
                          <a
                            key={i}
                            href={a.url}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 10px',
                              border: BDR,
                              borderRadius: 6,
                              fontSize: 12,
                              color: token.colorText,
                              textDecoration: 'none',
                              background: '#1e1f22',
                            }}
                          >
                            <span>{iconMap[a.type]}</span>
                            {a.title}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Criteria ── */}
            {activeTab === 'criteria' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(task.criteria ?? []).length === 0 && (
                  <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>Критерии не добавлены.</div>
                )}
                {(task.criteria ?? []).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: BDR,
                    }}
                  >
                    <Checkbox checked={c.done} style={{ marginTop: 1 }} />
                    <span
                      style={{
                        fontSize: 13,
                        color: c.done ? token.colorTextTertiary : token.colorText,
                        textDecoration: c.done ? 'line-through' : 'none',
                        lineHeight: 1.5,
                      }}
                    >
                      {c.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Compliance ── */}
            {activeTab === 'compliance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(task.compliance ?? []).length === 0 && (
                  <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>Compliance-требования не указаны.</div>
                )}
                {(task.compliance ?? []).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 0',
                      borderBottom: BDR,
                    }}
                  >
                    {c.passed
                      ? <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 16 }} />
                      : <ExclamationCircleOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
                    }
                    <span style={{ fontSize: 13, color: token.colorText, flex: 1 }}>{c.label}</span>
                    <Tag
                      style={{
                        fontSize: 11,
                        border: `1px solid ${c.passed ? token.colorSuccess : token.colorWarning}`,
                        color: c.passed ? token.colorSuccess : token.colorWarning,
                        background: 'transparent',
                        margin: 0,
                      }}
                    >
                      {c.passed ? 'Пройдено' : 'Ожидает'}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {/* ── Discussion ── */}
            {activeTab === 'discussion' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(task.comments ?? []).length === 0 && (
                  <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>Комментариев пока нет.</div>
                )}
                {(task.comments ?? []).map((cm) => (
                  <div key={cm.id} style={{ display: 'flex', gap: 10 }}>
                    <UserAvatar user={cm.author} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{cm.author.name}</span>
                        <span style={{ fontSize: 11, color: token.colorTextTertiary }}>{cm.time}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: token.colorText,
                          background: '#1e1f22',
                          border: BDR,
                          borderRadius: 8,
                          padding: '8px 12px',
                          lineHeight: 1.6,
                        }}
                      >
                        {cm.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: sidebar meta ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Meta */}
          <div
            style={{
              background: '#16171a',
              border: BDR,
              borderRadius: 10,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Детали
            </div>

            <MetaRow label="Статус">
              <Tag style={{ fontSize: 11, border: BDR, background: '#1e1f22', color: token.colorText, margin: 0 }}>
                {STATUS_LABEL[task.status]}
              </Tag>
            </MetaRow>

            <MetaRow label="Приоритет">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor, display: 'inline-block' }} />
                {PRIORITY_LABEL[task.priority]}
              </span>
            </MetaRow>

            <MetaRow label="Риск">
              <span style={{ color: riskColor }}>
                {task.riskLevel === 'critical' ? '● Критический'
                  : task.riskLevel === 'warning' ? '● Предупреждение'
                  : '● Норма'}
              </span>
            </MetaRow>

            {task.assignee && (
              <MetaRow label="Исполнитель">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserAvatar user={task.assignee} size={22} />
                  <span style={{ fontSize: 13 }}>{task.assignee.name}</span>
                </div>
              </MetaRow>
            )}

            {task.deadline && (
              <MetaRow label="Дедлайн">
                <span style={{ color: isOverdue ? token.colorError : token.colorText, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  {new Date(task.deadline).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {isOverdue && ' (просрочено)'}
                </span>
              </MetaRow>
            )}

            {task.storyPoints !== undefined && (
              <MetaRow label="Story Points">
                <span style={{ background: '#2D2E30', borderRadius: 4, padding: '1px 8px', fontSize: 13 }}>
                  {task.storyPoints} SP
                </span>
              </MetaRow>
            )}

            {task.epicId && (
              <MetaRow label="Эпик">
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: token.colorPrimary }}>{task.epicId}</span>
              </MetaRow>
            )}

            {task.sprintId && (
              <MetaRow label="Спринт">
                <span style={{ fontSize: 13 }}>{task.sprintId}</span>
              </MetaRow>
            )}
          </div>

          {/* Progress */}
          {totalCriteria > 0 && (
            <div
              style={{
                background: '#16171a',
                border: BDR,
                borderRadius: 10,
                padding: '16px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Прогресс
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: token.colorTextSecondary }}>Критерии приёмки</span>
                <span style={{ color: token.colorText }}>{completedCriteria}/{totalCriteria}</span>
              </div>
              <div style={{ height: 4, background: '#2D2E30', borderRadius: 2 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalCriteria ? (completedCriteria / totalCriteria) * 100 : 0}%`,
                    background: completedCriteria === totalCriteria ? token.colorSuccess : token.colorPrimary,
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }}
                />
              </div>

              {totalCompliance > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, marginTop: 12 }}>
                    <span style={{ color: token.colorTextSecondary }}>Compliance</span>
                    <span style={{ color: token.colorText }}>{passedCompliance}/{totalCompliance}</span>
                  </div>
                  <div style={{ height: 4, background: '#2D2E30', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${totalCompliance ? (passedCompliance / totalCompliance) * 100 : 0}%`,
                        background: passedCompliance === totalCompliance ? token.colorSuccess : token.colorWarning,
                        borderRadius: 2,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
