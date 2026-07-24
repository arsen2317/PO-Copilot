import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, theme, Tooltip } from 'antd';
import { BookOutlined, CheckOutlined, DeleteOutlined, RobotOutlined } from '@ant-design/icons';
import { useUIStore } from '../../../store/uiStore';

const { useToken } = theme;

// ─── Drafts view ──────────────────────────────────────────────────────────────

export function DraftsView({ bdr, highlightId }: { bdr: string; highlightId?: string }) {
  const { token } = useToken();
  const navigate = useNavigate();
  const drafts = useUIStore((s) => s.taskDrafts);
  const removeTaskDraft = useUIStore((s) => s.removeTaskDraft);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  if (drafts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: token.colorTextTertiary }}>
        <RobotOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 14, marginBottom: 6 }}>Черновиков пока нет</div>
        <div style={{ fontSize: 12 }}>
          Попроси агента «Постановщик задач» создать задачу — она появится здесь
        </div>
      </div>
    );
  }

  const priorityColor = (p: string) => {
    const m: Record<string, string> = { P0: 'error', P1: 'warning', P2: 'processing', P3: 'default' };
    return m[p] ?? 'default';
  };

  const typeColor = (t: string) => {
    const m: Record<string, string> = { Story: '#49aa19', Bug: '#dc4446', Task: '#1668dc', Spike: '#722ed1' };
    return m[t] ?? '#9B9C9E';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {drafts.map((draft) => {
        const isHighlighted = draft.id === highlightId;
        return (
        <div
          key={draft.id}
          ref={isHighlighted ? highlightRef : null}
          style={{ background: '#16171a', border: isHighlighted ? '1px solid rgba(74,130,247,0.6)' : bdr, borderRadius: 10, padding: '16px 18px', transition: 'border-color 0.3s', boxShadow: isHighlighted ? '0 0 0 3px rgba(74,130,247,0.15)' : 'none' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Tag color={priorityColor(draft.priority)} style={{ fontSize: 11, margin: 0 }}>{draft.priority}</Tag>
                <span style={{ fontSize: 12, fontWeight: 600, color: typeColor(draft.type), border: `1px solid ${typeColor(draft.type)}40`, borderRadius: 4, padding: '0 6px', lineHeight: '18px' }}>
                  {draft.type}
                </span>
                {draft.storyPoints && (
                  <span style={{ fontSize: 11, color: token.colorTextTertiary, background: '#2D2E30', borderRadius: 4, padding: '0 6px' }}>{draft.storyPoints} SP</span>
                )}
                {draft.labels?.map((l) => (
                  <Tag key={l} style={{ fontSize: 10, padding: '0 5px', margin: 0, border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>{l}</Tag>
                ))}
                <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 'auto' }}>
                  {new Date(draft.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>{draft.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Tooltip title="Принять как задачу">
                <Button size="small" type="primary" icon={<CheckOutlined />} style={{ fontSize: 12 }}>
                  Принять
                </Button>
              </Tooltip>
              <Tooltip title="Удалить черновик">
                <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeTaskDraft(draft.id)} />
              </Tooltip>
            </div>
          </div>

          {/* Description */}
          {draft.description && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 12 }}>{draft.description}</div>
          )}

          {/* Criteria */}
          {draft.criteria.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Критерии приёмки
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {draft.criteria.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: token.colorText, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: token.colorTextQuaternary, flexShrink: 0 }}>◻</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance notes */}
          {draft.complianceNotes && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: `${token.colorWarning}18`, border: `1px solid ${token.colorWarning}40`, borderRadius: 6, fontSize: 12, color: token.colorText }}>
              <span style={{ fontWeight: 600, color: token.colorWarning }}>Compliance: </span>
              {draft.complianceNotes}
            </div>
          )}

          {/* Linked knowledge artifacts */}
          {(draft.linkedArtifacts ?? []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Связанные артефакты
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {draft.linkedArtifacts!.map((a) => (
                  <span
                    key={a.id}
                    onClick={() => void navigate(`/knowledge/${a.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', border: bdr, borderRadius: 6,
                      fontSize: 12, color: token.colorPrimary, cursor: 'pointer',
                      background: '#1e1f22',
                    }}
                  >
                    <BookOutlined style={{ fontSize: 12 }} />
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
