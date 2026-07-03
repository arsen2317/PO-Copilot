import { useEffect, useState } from 'react';
import {
  Drawer, Form, Input, Select, Button, Divider, Space,
  Typography, Tag, theme,
} from 'antd';
import { LinkOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { metricGroupsFixture } from '../../data/fixtures/metrics';
import { getArtifacts } from '../../data/api/knowledge';
import type { CjmFlowNode, CjmNodeData, ArtifactType } from '../../data/types';

type CjmFormValues = {
  label?: string;
  metric?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  channel?: string;
  linkedMetricId?: string;
  linkedArtifactId?: string;
};

const { Text } = Typography;

const NODE_TYPE_LABELS: Record<string, string> = {
  stage:       'Этап',
  touchpoint:  'Touchpoint',
  emotion:     'Мысли / эмоции',
  pain:        'Боль',
  opportunity: 'Возможность',
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  survey:   'Опрос',
  research: 'Исследование',
  analysis: 'Анализ',
  report:   'Отчёт',
};

// Flatten all metrics from all groups
const ALL_METRICS = metricGroupsFixture.flatMap((g) =>
  g.metrics.map((m) => ({ ...m, groupName: g.name })),
);

interface Props {
  node: CjmFlowNode | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Partial<CjmNodeData>) => void;
}

export default function CjmEditDrawer({ node, onClose, onSave }: Props) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm<CjmFormValues>();

  const { data: artifacts = [] } = useQuery({
    queryKey: ['artifacts'],
    queryFn: getArtifacts,
  });

  useEffect(() => {
    if (node) {
      const vals: CjmFormValues = { label: node.data.label };
      if (node.data.channel          !== undefined) vals.channel          = node.data.channel;
      if (node.data.metric           !== undefined) vals.metric           = node.data.metric;
      if (node.data.sentiment        !== undefined) vals.sentiment        = node.data.sentiment;
      if (node.data.linkedMetricId   !== undefined) vals.linkedMetricId   = node.data.linkedMetricId;
      if (node.data.linkedArtifactId !== undefined) vals.linkedArtifactId = node.data.linkedArtifactId;
      form.setFieldsValue(vals);
    }
  }, [node, form]);

  const handleSave = () => {
    if (!node) return;
    const values = form.getFieldsValue();
    onSave(node.id, values);
    onClose();
  };

  const linkedMetric = node?.data.linkedMetricId
    ? ALL_METRICS.find((m) => m.id === node.data.linkedMetricId)
    : null;

  const linkedArtifact = node?.data.linkedArtifactId
    ? artifacts.find((a) => a.id === node.data.linkedArtifactId)
    : null;

  const showMetricPicker  = node?.type === 'stage' || node?.type === 'touchpoint';
  const showArtifactPicker = node?.type === 'pain' || node?.type === 'opportunity' || node?.type === 'stage';
  const showChannel        = node?.type === 'touchpoint';
  const showSentiment      = node?.type === 'emotion';
  const showStageMetric    = node?.type === 'stage';

  return (
    <Drawer
      open={!!node}
      onClose={onClose}
      title={
        node ? (
          <Space>
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {NODE_TYPE_LABELS[node.type] ?? node.type}
            </Text>
          </Space>
        ) : null
      }
      width={360}
      styles={{
        body:   { padding: '16px 20px' },
        header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: '14px 20px' },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" onClick={handleSave}>Сохранить</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" size="small">
        {/* Label */}
        <Form.Item label="Текст" name="label" rules={[{ required: true }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>

        {/* Channel (touchpoint only) */}
        {showChannel && (
          <Form.Item label="Канал" name="channel">
            <Input placeholder="Приложение / SMS / Офлайн" />
          </Form.Item>
        )}

        {/* Sentiment (emotion only) */}
        {showSentiment && (
          <Form.Item label="Тональность" name="sentiment">
            <Select
              options={[
                { value: 'positive', label: '😊 Позитивная' },
                { value: 'neutral',  label: '😐 Нейтральная' },
                { value: 'negative', label: '😤 Негативная' },
              ]}
            />
          </Form.Item>
        )}

        {/* Stage metric text (stage only) */}
        {showStageMetric && (
          <Form.Item label="Метрика (текст)" name="metric">
            <Input placeholder="84 000 пользователей" />
          </Form.Item>
        )}

        {/* Metric picker */}
        {showMetricPicker && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Form.Item
              label={
                <Space size={4}>
                  <ExperimentOutlined style={{ color: token.colorPrimary }} />
                  <span>Привязать метрику</span>
                </Space>
              }
              name="linkedMetricId"
            >
              <Select
                allowClear
                placeholder="Выбрать метрику..."
                options={ALL_METRICS.map((m) => ({
                  value: m.id,
                  label: `${m.name} — ${m.currentQuarter.toLocaleString('ru')} ${m.unit}`,
                  title: m.groupName,
                }))}
                optionRender={(opt) => (
                  <div>
                    <Text style={{ fontSize: 12 }}>{opt.data.label}</Text>
                    <br />
                    <Text style={{ fontSize: 10, color: token.colorTextTertiary }}>{opt.data.title}</Text>
                  </div>
                )}
              />
            </Form.Item>
            {linkedMetric && (
              <div style={{
                background: token.colorFillSecondary,
                borderRadius: token.borderRadius,
                padding: '6px 10px',
                marginTop: -8,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <Text style={{ fontSize: 11, color: token.colorText }}>{linkedMetric.name}</Text>
                <Text style={{ fontSize: 11, color: token.colorPrimary, fontWeight: 600 }}>
                  {linkedMetric.currentQuarter.toLocaleString('ru')} {linkedMetric.unit}
                </Text>
              </div>
            )}
          </>
        )}

        {/* Artifact picker */}
        {showArtifactPicker && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Form.Item
              label={
                <Space size={4}>
                  <LinkOutlined style={{ color: token.colorSuccess }} />
                  <span>Связать с артефактом</span>
                </Space>
              }
              name="linkedArtifactId"
            >
              <Select
                allowClear
                placeholder="Выбрать из базы знаний..."
                options={artifacts.map((a) => ({
                  value: a.id,
                  label: a.title,
                  tag: ARTIFACT_TYPE_LABELS[a.type],
                }))}
                optionRender={(opt) => (
                  <div>
                    <Tag style={{ fontSize: 9 }}>{opt.data.tag}</Tag>
                    <Text style={{ fontSize: 12 }}>{opt.data.label}</Text>
                  </div>
                )}
              />
            </Form.Item>
            {linkedArtifact && (
              <div
                style={{
                  background: token.colorFillSecondary,
                  borderRadius: token.borderRadius,
                  padding: '6px 10px',
                  marginTop: -8,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => void navigate(`/knowledge/${linkedArtifact.id}`)}
              >
                <Text style={{ fontSize: 11, color: token.colorText }}>{linkedArtifact.title}</Text>
                <LinkOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
              </div>
            )}
          </>
        )}
      </Form>
    </Drawer>
  );
}

// ── "Add stage" drawer ────────────────────────────────────────────────────────

interface AddStageProps {
  open: boolean;
  onClose: () => void;
  onAdd: (label: string) => void;
}

export function AddStageDrawer({ open, onClose, onAdd }: AddStageProps) {
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim());
    setLabel('');
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Добавить этап"
      width={360}
      styles={{ body: { padding: '16px 20px' } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" onClick={handleAdd} disabled={!label.trim()}>
            Добавить
          </Button>
        </div>
      }
    >
      <Form layout="vertical" size="small">
        <Form.Item label="Название этапа" required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Например: Повторная покупка"
            onPressEnter={handleAdd}
            autoFocus
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Новый этап будет добавлен в конец цепочки. Touchpoint, эмоции, боли и возможности
          можно будет заполнить кликом по ноде.
        </Text>
      </Form>
    </Drawer>
  );
}
