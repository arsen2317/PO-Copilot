import { useState } from 'react';
import { Flex, Input, Modal, theme, Typography } from 'antd';
import { BarChartOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { useToken } = theme;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface TemplateItem {
  key: string;
  label: string;
  route?: string;
}

const DASHBOARD_TEMPLATES: TemplateItem[] = [
  { key: 'activity', label: 'Активность пользователей', route: '/' },
  { key: 'kpis', label: 'KPI продукта', route: '/' },
  { key: 'funnel', label: 'Анализ воронки', route: '/' },
];

const CHART_TEMPLATES: TemplateItem[] = [
  { key: 'dau', label: 'Активные пользователи (ежедневно)', route: '/' },
  { key: 'wau', label: 'Активные пользователи (еженедельно)', route: '/' },
  { key: 'device', label: 'Активные пользователи по устройствам', route: '/' },
];

function DashboardIcon() {
  const { token } = useToken();
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill={token.colorPrimary} opacity={0.85} />
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill={token.colorPrimary} opacity={0.55} />
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill={token.colorPrimary} opacity={0.55} />
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill={token.colorPrimary} opacity={0.85} />
    </svg>
  );
}

function TemplateSection({
  title,
  items,
  icon,
  onSelect,
}: {
  title: string;
  items: TemplateItem[];
  icon: React.ReactNode;
  onSelect: (item: TemplateItem) => void;
}) {
  const { token } = useToken();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div>
      <Typography.Text
        style={{
          display: 'block',
          fontSize: 12,
          color: token.colorTextTertiary,
          padding: '10px 20px 6px',
          fontWeight: 500,
        }}
      >
        {title}
      </Typography.Text>
      {items.map((item) => (
        <Flex
          key={item.key}
          align="center"
          gap={12}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setHoveredKey(item.key)}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            background: hoveredKey === item.key ? token.colorFillSecondary : 'transparent',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
          <Typography.Text style={{ fontSize: 14 }}>{item.label}</Typography.Text>
        </Flex>
      ))}
    </div>
  );
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { token } = useToken();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSelect = (item: TemplateItem) => {
    if (item.route) void navigate(item.route);
    onClose();
    setQuery('');
  };

  const handleClose = () => {
    onClose();
    setQuery('');
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={null}
      width={760}
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
          borderRadius: token.borderRadiusLG,
          background: token.colorBgElevated,
        },
        mask: { backdropFilter: 'blur(2px)' },
      }}
      centered
      closable={false}
    >
      {/* Search input */}
      <Flex
        align="center"
        gap={10}
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <SearchOutlined style={{ fontSize: 18, color: token.colorTextTertiary, flexShrink: 0 }} />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск или задайте вопрос..."
          variant="borderless"
          style={{
            fontSize: 16,
            padding: 0,
            flex: 1,
          }}
          onPressEnter={handleClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClose();
          }}
        />
      </Flex>

      {/* Templates */}
      <div style={{ paddingBottom: 8 }}>
        <TemplateSection
          title="Шаблоны дашбордов"
          items={DASHBOARD_TEMPLATES}
          icon={<DashboardIcon />}
          onSelect={handleSelect}
        />

        <div
          style={{
            height: 1,
            background: token.colorBorderSecondary,
            margin: '4px 0',
          }}
        />

        <TemplateSection
          title="Шаблоны графиков"
          items={CHART_TEMPLATES}
          icon={
            <BarChartOutlined
              style={{ fontSize: 18, color: token.colorPrimary }}
            />
          }
          onSelect={handleSelect}
        />
      </div>
    </Modal>
  );
}
