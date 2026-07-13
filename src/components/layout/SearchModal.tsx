import { useState } from 'react';
import { Flex, Input, Modal, theme, Typography } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckSquareOutlined,
  LineChartOutlined,
  MessageOutlined,
  RiseOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { useToken } = theme;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  key: string;
  label: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  keywords: string[];
}

function DashboardIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={color} opacity={0.85} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={color} opacity={0.55} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={color} opacity={0.55} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={color} opacity={0.85} />
    </svg>
  );
}

function UnitEconIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12 L5 8 L8 10 L11 5 L14 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="7" r="1.5" fill={color} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'assistant',
    label: 'Ассистент',
    description: 'ИИ-помощник для анализа и планирования',
    route: '/assistant',
    icon: <MessageOutlined />,
    keywords: ['ассистент', 'чат', 'ии', 'помощник', 'ai'],
  },
  {
    key: 'dashboard',
    label: 'Дашборд',
    description: 'Виджеты метрик, воронки, NPS, команды',
    route: '/dashboard',
    icon: null,
    keywords: ['дашборд', 'dashboard', 'виджет', 'метрики', 'сводка'],
  },
  {
    key: 'metrics',
    label: 'Метрики',
    description: 'Ключевые показатели продукта и тренды',
    route: '/metrics',
    icon: <LineChartOutlined />,
    keywords: ['метрики', 'kpi', 'показатели', 'графики', 'тренды'],
  },
  {
    key: 'funnel',
    label: 'Воронка конверсии',
    description: 'Анализ шагов конверсии и падения',
    route: '/funnel',
    icon: <RiseOutlined style={{ transform: 'rotate(90deg)' }} />,
    keywords: ['воронка', 'конверсия', 'funnel', 'cr', 'шаги', 'падение'],
  },
  {
    key: 'cjm',
    label: 'CJM',
    description: 'Карты пути клиента по дебетовой карте',
    route: '/cjm',
    icon: <UserOutlined />,
    keywords: ['cjm', 'карта пути', 'клиент', 'путь', 'journey'],
  },
  {
    key: 'unit-economics',
    label: 'Unit-экономика',
    description: 'Доходы, расходы, LTV, окупаемость карты',
    route: '/unit-economics',
    icon: null,
    keywords: ['unit', 'экономика', 'ltv', 'cac', 'окупаемость', 'доходы', 'расходы', 'маржа'],
  },
  {
    key: 'tasks',
    label: 'Задачи',
    description: 'Канбан, бэклог, таймлайн, скоринг',
    route: '/tasks',
    icon: <CheckSquareOutlined />,
    keywords: ['задачи', 'tasks', 'канбан', 'бэклог', 'спринт', 'ice', 'rice'],
  },
  {
    key: 'agents',
    label: 'Агенты',
    description: 'Готовые ИИ-агенты и конструктор',
    route: '/agents',
    icon: <BarChartOutlined />,
    keywords: ['агенты', 'agents', 'автоматизация', 'конструктор'],
  },
  {
    key: 'services',
    label: 'ИИ-сервисы',
    description: 'Каталог сторонних ИИ-инструментов',
    route: '/services',
    icon: <AppstoreOutlined />,
    keywords: ['сервисы', 'services', 'инструменты', 'каталог', 'плагины'],
  },
  {
    key: 'rooms',
    label: 'Комнаты',
    description: 'Планирование, ретро, груминг',
    route: '/rooms',
    icon: <TeamOutlined />,
    keywords: ['комнаты', 'rooms', 'планирование', 'ретро', 'груминг', 'спринт'],
  },
  {
    key: 'knowledge',
    label: 'База знаний',
    description: 'Граф артефактов, исследования, отчёты',
    route: '/knowledge',
    icon: <BookOutlined />,
    keywords: ['база знаний', 'knowledge', 'артефакты', 'исследования', 'документы'],
  },
  {
    key: 'profile',
    label: 'Профиль',
    description: 'Настройки уведомлений, интеграций и агентов',
    route: '/profile',
    icon: <UserOutlined />,
    keywords: ['профиль', 'profile', 'настройки', 'уведомления', 'интеграции'],
  },
];

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { token } = useToken();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.some((kw) => kw.includes(q)),
      )
    : NAV_ITEMS;

  const handleSelect = (item: NavItem) => {
    void navigate(item.route);
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
      width={640}
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
          placeholder="Поиск по разделам..."
          variant="borderless"
          style={{ fontSize: 16, padding: 0, flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'Enter' && filtered.length > 0) {
              handleSelect(filtered[0]!);
            }
          }}
        />
        {q && (
          <span
            style={{ fontSize: 11, color: token.colorTextTertiary, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => setQuery('')}
          >
            Очистить
          </span>
        )}
      </Flex>

      {/* Results */}
      <div className="content-scroll" style={{ paddingBottom: 8, maxHeight: 420, overflowY: 'auto' }}>
        <Typography.Text
          style={{
            display: 'block',
            fontSize: 11,
            color: token.colorTextQuaternary,
            padding: '10px 20px 6px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {q ? `Результаты (${filtered.length})` : 'Быстрый переход'}
        </Typography.Text>

        {filtered.length === 0 && (
          <div style={{ padding: '16px 20px', color: token.colorTextSecondary, fontSize: 13 }}>
            Ничего не найдено
          </div>
        )}

        {filtered.map((item) => (
          <Flex
            key={item.key}
            align="center"
            gap={12}
            onClick={() => handleSelect(item)}
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              background: hoveredKey === item.key ? token.colorFillSecondary : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              flexShrink: 0,
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: token.colorFillTertiary,
              fontSize: 15,
              color: token.colorPrimary,
            }}>
              {item.key === 'dashboard'
                ? <DashboardIcon color={token.colorPrimary} />
                : item.key === 'unit-economics'
                  ? <UnitEconIcon color={token.colorPrimary} />
                  : item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text style={{ fontSize: 14, display: 'block' }}>{item.label}</Typography.Text>
              <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block' }}>
                {item.description}
              </Typography.Text>
            </div>
            <span style={{ fontSize: 11, color: token.colorTextQuaternary, flexShrink: 0 }}>→</span>
          </Flex>
        ))}
      </div>
    </Modal>
  );
}
