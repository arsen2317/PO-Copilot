import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TaskDraft } from '../../data/types';
import { Badge, Button, Select, theme, Tooltip, Typography } from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  FilterOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SortAscendingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../data/api/tasks';
import { useUIStore } from '../../store/uiStore';
import ScrollArea from '../../components/ScrollArea';
import TimelineView from './TimelineView';
import { PRIORITY_LABEL } from './taskConstants';
import { PriorityChevrons } from './TaskWidgets';
import { KanbanView } from './views/KanbanView';
import { ListView } from './views/ListView';
import { BacklogView } from './views/BacklogView';
import { DraftsView } from './views/DraftsView';
import DraftFormModal from './DraftFormModal';

const { useToken } = theme;

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = 'kanban' | 'list' | 'backlog' | 'timeline' | 'drafts';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'kanban', label: 'Канбан', icon: <AppstoreOutlined /> },
  { id: 'list', label: 'Список', icon: <BarsOutlined /> },
  { id: 'backlog', label: 'Бэклог', icon: <SortAscendingOutlined /> },
  { id: 'timeline', label: 'Таймлайн', icon: <ScheduleOutlined /> },
  { id: 'drafts', label: 'Черновики', icon: <RobotOutlined /> },
];

export default function TasksPage() {
  const { token } = useToken();
  const BDR = `1px solid ${token.colorBorderSecondary}`;
  const [searchParams, setSearchParams] = useSearchParams();
  // URL — источник истины для активной вкладки и подсветки черновика.
  // Так вкладка сохраняется при переходе на задачу и обратно, а внешняя навигация
  // (напр. ссылка ассистента на созданный черновик) переключает вкладку, даже если
  // страница уже открыта.
  const tabParam = searchParams.get('tab');
  const activeTab: TabId = (['drafts', 'kanban', 'list', 'backlog', 'timeline'] as const).includes(tabParam as TabId)
    ? (tabParam as TabId)
    : 'kanban';
  const highlightDraftId = searchParams.get('draft');
  const setActiveTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    next.delete('draft'); // подсветка актуальна только при переходе по ссылке, не при ручном клике
    setSearchParams(next, { replace: true });
  };
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const draftsCount = useUIStore((s) => s.taskDrafts.length);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<TaskDraft | null>(null);

  const openCreateDraft = () => { setEditingDraft(null); setDraftModalOpen(true); };
  const openEditDraft = (draft: TaskDraft) => { setEditingDraft(draft); setDraftModalOpen(true); };

  const { data: fetchedTasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });

  const filtered = fetchedTasks.filter((t) => {
    if (assigneeFilter && t.assignee?.id !== assigneeFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const assignees = Array.from(
    new Map(fetchedTasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values(),
  );

  const showFilters = activeTab !== 'drafts' && activeTab !== 'timeline';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}>
            Задачи
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Спринт 14 · {fetchedTasks.length} задач
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip title="Помощь">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <QuestionCircleOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Tooltip title="Копировать ссылку">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <LinkOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Button icon={<PlusOutlined />} type="primary" size="small" style={{ fontSize: 13, height: 30 }} onClick={openCreateDraft}>
            Создать драфт
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: BDR, marginBottom: 14, flexShrink: 0, gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                padding: '8px 16px', cursor: 'pointer',
                color: isActive ? token.colorPrimary : token.colorTextTertiary,
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'drafts' && draftsCount > 0 && (
                <Badge count={draftsCount} size="small" style={{ background: token.colorPrimary, boxShadow: 'none' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters (hidden on Drafts tab) ── */}
      {showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
          <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
          <Select
            placeholder={<><UserOutlined /> Исполнитель</>}
            allowClear style={{ width: 170 }}
            value={assigneeFilter} onChange={setAssigneeFilter}
            options={assignees.map((u) => ({ value: u.id, label: u.name }))}
          />
          <Select
            placeholder="Приоритет"
            allowClear style={{ width: 155 }}
            value={priorityFilter} onChange={setPriorityFilter}
            options={[
              { value: 'critical', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="critical" />{PRIORITY_LABEL.critical}</span> },
              { value: 'high',     label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="high" />{PRIORITY_LABEL.high}</span> },
              { value: 'medium',   label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="medium" />{PRIORITY_LABEL.medium}</span> },
              { value: 'low',      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="low" />{PRIORITY_LABEL.low}</span> },
            ]}
          />
          {(assigneeFilter || priorityFilter) && (
            <Button size="small" type="text" icon={<CloseOutlined />}
              style={{ color: token.colorTextTertiary, fontSize: 12 }}
              onClick={() => { setAssigneeFilter(null); setPriorityFilter(null); }}
            >
              Сбросить
            </Button>
          )}
        </div>
      )}

      {/* ── Tab content ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'kanban' && <KanbanView tasks={filtered} isLoading={isLoading} bdr={BDR} />}
        {activeTab === 'list' && <ListView tasks={filtered} isLoading={isLoading} />}
        {activeTab === 'backlog' && <ScrollArea style={{ flex: 1 }}><BacklogView tasks={filtered} isLoading={isLoading} bdr={BDR} /></ScrollArea>}
        {activeTab === 'timeline' && <TimelineView bdr={BDR} />}
        {activeTab === 'drafts' && <ScrollArea style={{ flex: 1 }}><DraftsView bdr={BDR} onEdit={openEditDraft} {...(highlightDraftId ? { highlightId: highlightDraftId } : {})} /></ScrollArea>}
      </div>

      <DraftFormModal
        open={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        onSaved={(mode) => { if (mode === 'create') setActiveTab('drafts'); }}
        editingDraft={editingDraft}
      />
    </div>
  );
}
