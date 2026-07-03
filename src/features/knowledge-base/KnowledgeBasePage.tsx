import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, Tag, Card, Row, Col, Spin } from 'antd';
import {
  FileTextOutlined, ExperimentOutlined, SearchOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { theme } from 'antd';
import { getArtifacts } from '../../data/api/knowledge';
import type { ArtifactType } from '../../data/types';

const { Title, Text } = Typography;

const ARTIFACT_TYPE_CONFIG: Record<ArtifactType, { label: string; color: string; icon: React.ReactNode }> = {
  survey:   { label: 'Опрос',        color: 'blue',   icon: <SearchOutlined /> },
  research: { label: 'Исследование', color: 'purple', icon: <ExperimentOutlined /> },
  analysis: { label: 'Анализ',       color: 'orange', icon: <BarChartOutlined /> },
  report:   { label: 'Отчёт',        color: 'green',  icon: <FileTextOutlined /> },
};

export default function KnowledgeBasePage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ['artifacts'],
    queryFn: getArtifacts,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={4} style={{ margin: 0, color: token.colorText }}>База знаний</Title>
        <Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
          Опросы, исследования, анализ и отчёты по продукту
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {artifacts.map((artifact) => {
          const cfg = ARTIFACT_TYPE_CONFIG[artifact.type];
          return (
            <Col key={artifact.id} xs={24} sm={12} xl={8}>
              <Card
                hoverable
                onClick={() => void navigate(`/knowledge/${artifact.id}`)}
                style={{
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                  cursor: 'pointer',
                  height: '100%',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11, margin: 0 }}>
                      {cfg.label}
                    </Tag>
                    <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
                      {artifact.createdAt}
                    </Text>
                  </div>
                  <Text strong style={{ fontSize: 14, color: token.colorText, lineHeight: 1.4 }}>
                    {artifact.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: token.colorTextSecondary,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {artifact.description.replace(/\*\*/g, '').replace(/^—\s/gm, '').split('\n')[0]}
                  </Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
