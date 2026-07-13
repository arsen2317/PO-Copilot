import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, Tag, Button, Breadcrumb, Spin, Divider } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, ExperimentOutlined, SearchOutlined, BarChartOutlined, LinkOutlined, RobotOutlined } from '../../components/icons';
import { theme } from 'antd';
import { getArtifactById } from '../../data/api/knowledge';
import { useUIStore } from '../../store/uiStore';
import type { ArtifactType } from '../../data/types';

const { Title, Text, Paragraph } = Typography;

const ARTIFACT_TYPE_CONFIG: Record<ArtifactType, { label: string; color: string; icon: React.ReactNode }> = {
  survey:   { label: 'Опрос',        color: 'blue',   icon: <SearchOutlined /> },
  research: { label: 'Исследование', color: 'purple', icon: <ExperimentOutlined /> },
  analysis: { label: 'Анализ',       color: 'orange', icon: <BarChartOutlined /> },
  report:   { label: 'Отчёт',        color: 'green',  icon: <FileTextOutlined /> },
};

const QUICK_PROMPTS = [
  'Кратко изложи ключевые выводы',
  'Какие задачи можно создать на основе этого?',
  'Найди связанные исследования и метрики',
];

function renderDescription(text: string, token: ReturnType<typeof theme.useToken>['token']) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 8 }} />);
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <Text key={key++} strong style={{ display: 'block', fontSize: 13, color: token.colorText, marginBottom: 4 }}>
          {line.replace(/\*\*/g, '')}
        </Text>,
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <div
          key={key++}
          style={{
            borderLeft: `3px solid ${token.colorBorderSecondary}`,
            paddingLeft: 12,
            marginBottom: 6,
          }}
        >
          <Text italic style={{ fontSize: 13, color: token.colorTextSecondary }}>
            {line.slice(2)}
          </Text>
        </div>,
      );
    } else if (/^[—\-•]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const content = line.replace(/^\*\*/g, '').replace(/\*\*/g, '');
      elements.push(
        <Paragraph key={key++} style={{ margin: '0 0 4px 0', fontSize: 13, color: token.colorText }}>
          {content}
        </Paragraph>,
      );
    } else {
      const withBold = line.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <Text key={i} strong>{part.slice(2, -2)}</Text>
          : part,
      );
      elements.push(
        <Paragraph key={key++} style={{ margin: '0 0 4px 0', fontSize: 13, color: token.colorText }}>
          {withBold}
        </Paragraph>,
      );
    }
  }

  return elements;
}

export default function ArtifactDetailPage() {
  const { token } = theme.useToken();
  const { artifactId } = useParams<{ artifactId: string }>();
  const navigate = useNavigate();
  const setPendingAgent = useUIStore((s) => s.setPendingAgent);
  const setPendingTrigger = useUIStore((s) => s.setPendingTrigger);

  const { data: artifact, isLoading } = useQuery({
    queryKey: ['artifact', artifactId],
    queryFn: () => getArtifactById(artifactId!),
    enabled: !!artifactId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin />
      </div>
    );
  }

  if (!artifact) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="secondary">Артефакт не найден.</Text>
      </div>
    );
  }

  const cfg = ARTIFACT_TYPE_CONFIG[artifact.type];

  const handleQuickPrompt = (prompt: string) => {
    const text = `[Артефакт: ${artifact.title}]\n${prompt}`;
    setPendingAgent('assistant');
    setPendingTrigger(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <Breadcrumb
        items={[
          { title: <span style={{ cursor: 'pointer' }} onClick={() => void navigate('/knowledge')}>База знаний</span> },
          { title: artifact.title },
        ]}
        style={{ fontSize: 12 }}
      />

      {/* Single-line header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => void navigate('/knowledge')}
          style={{ color: token.colorTextSecondary, flexShrink: 0 }}
        />
        <Title level={4} style={{ flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token.colorText }}>
          {artifact.title}
        </Title>
        <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>
          {cfg.label}
        </Tag>
        <Text style={{ fontSize: 12, color: token.colorTextTertiary, flexShrink: 0 }}>{artifact.createdAt}</Text>
      </div>

      <Divider style={{ margin: '0' }} />

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>

        {/* Left: article content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {artifact.sourceUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
            }}>
              <LinkOutlined style={{ fontSize: 13, color: token.colorTextSecondary, flexShrink: 0 }} />
              <Text style={{ fontSize: 12, color: token.colorTextSecondary, marginRight: 4 }}>Источник:</Text>
              <a
                href={artifact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: token.colorPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {artifact.sourceUrl}
              </a>
            </div>
          )}

          <div
            style={{
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: '20px 24px',
            }}
          >
            {renderDescription(artifact.description, token)}
          </div>
        </div>

        {/* Right: AI assistant stub */}
        <div style={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: '16px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ fontSize: 14, color: token.colorPrimary }} />
            <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>ИИ-ассистент</Text>
          </div>
          <Text style={{ fontSize: 12, color: token.colorTextTertiary, lineHeight: 1.5 }}>
            Быстрые действия с этим артефактом:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadius,
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: token.colorTextSecondary,
                  fontSize: 12,
                  lineHeight: 1.4,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = token.colorPrimary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = token.colorBorderSecondary;
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
