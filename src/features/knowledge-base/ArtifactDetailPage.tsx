import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, Tag, Button, Breadcrumb, Spin, Divider } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, ExperimentOutlined, SearchOutlined, BarChartOutlined, LinkOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import { getArtifactById } from '../../data/api/knowledge';
import type { ArtifactType } from '../../data/types';

const { Title, Text, Paragraph } = Typography;

const ARTIFACT_TYPE_CONFIG: Record<ArtifactType, { label: string; color: string; icon: React.ReactNode }> = {
  survey:   { label: 'Опрос',        color: 'blue',   icon: <SearchOutlined /> },
  research: { label: 'Исследование', color: 'purple', icon: <ExperimentOutlined /> },
  analysis: { label: 'Анализ',       color: 'orange', icon: <BarChartOutlined /> },
  report:   { label: 'Отчёт',        color: 'green',  icon: <FileTextOutlined /> },
};

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <Breadcrumb
        items={[
          { title: <span style={{ cursor: 'pointer' }} onClick={() => void navigate('/knowledge')}>База знаний</span> },
          { title: artifact.title },
        ]}
        style={{ fontSize: 12 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => void navigate('/knowledge')}
          style={{ color: token.colorTextSecondary }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11, margin: 0 }}>
              {cfg.label}
            </Tag>
            <Text style={{ fontSize: 12, color: token.colorTextTertiary }}>{artifact.createdAt}</Text>
          </div>
          <Title level={4} style={{ margin: 0, color: token.colorText }}>
            {artifact.title}
          </Title>
        </div>
      </div>

      <Divider style={{ margin: '4px 0' }} />

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
  );
}
