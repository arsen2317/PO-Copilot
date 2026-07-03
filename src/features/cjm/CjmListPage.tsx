import { theme, Typography, Badge, Button, Row, Col } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCjmList } from '../../data/api/cjm';
import { useCjmStore } from '../../store/cjmStore';
import { useUIStore } from '../../store/uiStore';
import type { CjmMap, CjmStatus } from '../../data/types';

const { Title, Text } = Typography;

const STATUS_LABELS: Record<CjmStatus, string> = {
  active:   'Активный',
  draft:    'Черновик',
  archived: 'Архив',
};

const STATUS_COLORS: Record<CjmStatus, 'success' | 'processing' | 'default'> = {
  active:   'success',
  draft:    'processing',
  archived: 'default',
};

function CjmCard({ map }: { map: CjmMap }) {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  return (
    <div
      onClick={() => void navigate(`/cjm/${map.id}`)}
      style={{
        background: token.colorBgElevated,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: '100%',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = token.colorPrimary;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = token.colorBorderSecondary;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Text strong style={{ fontSize: 14, color: token.colorText, lineHeight: 1.35 }}>
          {map.title}
        </Text>
        <Badge
          status={STATUS_COLORS[map.status]}
          text={
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>
              {STATUS_LABELS[map.status]}
            </Text>
          }
        />
      </div>

      <Text style={{ fontSize: 12, color: token.colorTextSecondary, lineHeight: 1.45 }}>
        {map.description}
      </Text>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
          <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>{map.persona}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
          <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
            Обновлён {map.updatedAt}
          </Text>
        </div>
      </div>
    </div>
  );
}

export default function CjmListPage() {
  const { token } = theme.useToken();
  const { data: fixtureMaps = [] } = useQuery({
    queryKey: ['cjm-list'],
    queryFn: getCjmList,
  });
  const generatedMaps = useCjmStore((s) => s.generatedMaps);
  const setPendingAgent = useUIStore((s) => s.setPendingAgent);
  const setPendingTrigger = useUIStore((s) => s.setPendingTrigger);

  const allMaps = [...generatedMaps, ...fixtureMaps];

  const handleCreateWithAI = () => {
    const existingTitles = allMaps.map((m: CjmMap) => `"${m.title}"`).join(', ');
    const existing = existingTitles ? `Уже существуют: ${existingTitles}.` : 'CJM пока нет.';
    setPendingAgent('agent-cjm');
    setPendingTrigger(`Помоги создать новый CJM. ${existing} Предложи 2–3 варианта новых CJM которых ещё нет, объясни каждый в 1-2 предложениях, и задай уточняющие вопросы чтобы понять что нужно пользователю.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: token.colorText }}>
            CJM
          </Title>
          <Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
            Карты пути клиента по продукту «Дебетовые карты»
          </Text>
        </div>
        <Button
          type="primary"
          icon={<NodeIndexOutlined />}
          onClick={handleCreateWithAI}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          Создать CJM с ИИ
        </Button>
      </div>

      {/* Grid */}
      <Row gutter={[16, 16]}>
        {allMaps.map((map) => (
          <Col key={map.id} xs={24} sm={12} xl={8}>
            <CjmCard map={map} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
