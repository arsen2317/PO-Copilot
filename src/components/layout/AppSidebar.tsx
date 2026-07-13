import { useState } from 'react';
import {
  Activity01Icon,
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CheckSquareOutlined,
  DashboardSquareIcon,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  SearchCircleIcon,
  SettingOutlined,
  TeamOutlined,
  TokenCircleIcon,
  UserOutlined,
} from '../icons';
import { Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchModal from './SearchModal';

interface AppSidebarProps {
  unreadCount: number;
}

const ANALYTICS_SUBITEMS = [
  { key: '/dashboard',       label: 'Дашборд' },
  { key: '/funnel',          label: 'Воронка' },
  { key: '/cjm',             label: 'CJM' },
  { key: '/unit-economics',  label: 'Unit-экономика' },
  { key: '/retention',       label: 'Удержание' },
  { key: '/features',        label: 'Фичи' },
] as const;

const ANALYTICS_KEYS = new Set(ANALYTICS_SUBITEMS.map((i) => i.key));

const ASSISTANT_ITEM = { key: '/assistant', icon: MessageOutlined, label: 'Ассистент' } as const;

const NAV_ITEMS = [
  { key: '/metrics',    icon: Activity01Icon,        label: 'Метрики' },
  { key: '/services',   icon: AppstoreOutlined,      label: 'ИИ-сервисы' },
  { key: '/tasks',      icon: CheckSquareOutlined,   label: 'Задачи' },
  { key: '/rooms',      icon: TeamOutlined,          label: 'Комнаты' },
  { key: '/knowledge',  icon: BookOutlined,          label: 'База знаний' },
] as const;

const BOTTOM_ITEMS = [
  { key: '/profile',       icon: UserOutlined,          label: 'Профиль' },
  { key: '/notifications', icon: BellOutlined,          label: 'Уведомления' },
  { key: '/settings',      icon: SettingOutlined,       label: 'Настройки' },
  { key: '__help__',       icon: QuestionCircleOutlined, label: 'Помощь' },
] as const;

export default function AppSidebar({ unreadCount }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const isAnalyticsActive =
    ANALYTICS_KEYS.has(location.pathname as '/dashboard') ||
    location.pathname.startsWith('/cjm');
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const selectedKey: string =
    [ASSISTANT_ITEM, ...NAV_ITEMS].find((item) => {
      const k = item.key as string;
      return location.pathname.startsWith(k);
    })?.key as string | undefined ?? (isAnalyticsActive ? location.pathname : '');

  const handleNavClick = (key: string) => {
    if (key === '__search__') { setSearchOpen(true); return; }
    if (key === '__help__') return;
    void navigate(key);
  };

  const handleAnalyticsGroupClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setAnalyticsOpen(true);
      void navigate('/dashboard');
      return;
    }
    // If not on an analytics route, navigate to dashboard; always toggle open
    if (!isAnalyticsActive) void navigate('/dashboard');
    setAnalyticsOpen((v) => !v);
  };

  const navItemStyle = (key: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: collapsed ? 0 : 9.57,
    height: 38,
    paddingLeft: collapsed ? 0 : 9.57,
    paddingRight: collapsed ? 0 : 9.57,
    borderRadius: 9.57,
    cursor: 'pointer',
    background:
      key === selectedKey
        ? 'rgba(255,255,255,0.07)'
        : hoveredKey === key
          ? 'rgba(255,255,255,0.04)'
          : 'transparent',
    transition: 'background 0.15s',
  });

  const bottomItemStyle = (key: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: collapsed ? 0 : 8,
    height: 36,
    paddingLeft: collapsed ? 0 : 8,
    paddingRight: collapsed ? 0 : 8,
    borderRadius: 9.57,
    cursor: key === '__help__' ? 'default' : 'pointer',
    background: hoveredKey === key ? 'rgba(255,255,255,0.04)' : 'transparent',
    transition: 'background 0.15s',
  });

  const iconStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    color: '#9B9C9E',
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    color: '#9B9C9E',
    fontSize: 15.55,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <>
      <div
        style={{
          width: collapsed ? 52 : 238,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: collapsed ? 0 : 12,
          overflow: 'hidden',
          transition: 'width 0.18s ease, padding 0.18s ease',
        }}
      >
        {/* ── Top: logo + nav ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Logo + collapse toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: collapsed ? '20px 0 16px' : '20px 9.57px 16px',
              transition: 'padding 0.18s ease',
            }}
          >
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9.57, overflow: 'hidden' }}>
                <span style={{ fontSize: 18, color: '#4A82F7', flexShrink: 0, lineHeight: 1 }}>
                  <TokenCircleIcon />
                </span>
                <span style={{ color: '#D7D8DA', fontSize: 15.55, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  PO Copilot
                </span>
              </div>
            )}
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                color: '#9B9C9E', fontSize: 14, flexShrink: 0,
                marginLeft: collapsed ? 'auto' : 0,
                marginRight: collapsed ? 'auto' : 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </div>

          {/* ── Search ── */}
          <Tooltip title={collapsed ? 'Поиск' : ''} placement="right">
            <div
              style={navItemStyle('__search__')}
              onClick={() => handleNavClick('__search__')}
              onMouseEnter={() => setHoveredKey('__search__')}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <span style={iconStyle}><SearchCircleIcon /></span>
              {!collapsed && <span style={labelStyle}>Поиск</span>}
            </div>
          </Tooltip>

          {/* ── Assistant ── */}
          <Tooltip title={collapsed ? ASSISTANT_ITEM.label : ''} placement="right">
            <div
              style={navItemStyle(ASSISTANT_ITEM.key)}
              onClick={() => handleNavClick(ASSISTANT_ITEM.key)}
              onMouseEnter={() => setHoveredKey(ASSISTANT_ITEM.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <span style={iconStyle}>
                <ASSISTANT_ITEM.icon />
              </span>
              {!collapsed && (
                <span style={{ ...labelStyle, color: ASSISTANT_ITEM.key === selectedKey ? '#D7D8DA' : '#9B9C9E' }}>
                  {ASSISTANT_ITEM.label}
                </span>
              )}
            </div>
          </Tooltip>

          {/* ── Analytics group ── */}
          <Tooltip title={collapsed ? 'Аналитика' : ''} placement="right">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                height: 38,
                paddingLeft: collapsed ? 0 : 9.57,
                paddingRight: collapsed ? 0 : 6,
                borderRadius: 9.57,
                cursor: 'pointer',
                background: isAnalyticsActive && collapsed
                  ? 'rgba(255,255,255,0.07)'
                  : hoveredKey === '__analytics__'
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                transition: 'background 0.15s',
              }}
              onClick={handleAnalyticsGroupClick}
              onMouseEnter={() => setHoveredKey('__analytics__')}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 9.57, minWidth: 0 }}>
                <span style={{ ...iconStyle, color: isAnalyticsActive ? '#D7D8DA' : '#9B9C9E' }}>
                  <DashboardSquareIcon />
                </span>
                {!collapsed && (
                  <span style={{ ...labelStyle, color: isAnalyticsActive ? '#D7D8DA' : '#9B9C9E' }}>
                    Аналитика
                  </span>
                )}
              </div>
              {!collapsed && (
                <DownOutlined
                  style={{
                    fontSize: 10,
                    color: '#9B9C9E',
                    flexShrink: 0,
                    transform: analyticsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.18s ease',
                  }}
                />
              )}
            </div>
          </Tooltip>

          {/* ── Analytics subitems ── */}
          {!collapsed && analyticsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, marginBottom: 2 }}>
              {ANALYTICS_SUBITEMS.map(({ key, label }) => {
                const isActive =
                  location.pathname === key ||
                  (key === '/cjm' && location.pathname.startsWith('/cjm'));
                return (
                  <div
                    key={key}
                    onClick={() => void navigate(key)}
                    onMouseEnter={() => setHoveredKey(`sub-${key}`)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 34,
                      paddingLeft: 36,
                      paddingRight: 9.57,
                      borderRadius: 9.57,
                      cursor: 'pointer',
                      background: isActive
                        ? 'rgba(255,255,255,0.07)'
                        : hoveredKey === `sub-${key}`
                          ? 'rgba(255,255,255,0.04)'
                          : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? '#D7D8DA' : '#9B9C9E',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Other nav items ── */}
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <Tooltip key={key} title={collapsed ? label : ''} placement="right">
              <div
                style={navItemStyle(key)}
                onClick={() => handleNavClick(key)}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span style={iconStyle}>
                  <Icon />
                </span>
                {!collapsed && (
                  <span style={{ ...labelStyle, color: key === selectedKey ? '#D7D8DA' : '#9B9C9E' }}>
                    {label}
                  </span>
                )}
              </div>
            </Tooltip>
          ))}
        </div>

        {/* ── Bottom items ── */}
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 4 }}>
          {BOTTOM_ITEMS.map(({ key, icon: Icon, label }) => (
            <Tooltip key={key} title={collapsed ? label : ''} placement="right">
              <div
                style={bottomItemStyle(key)}
                onClick={() => handleNavClick(key)}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {key === '/profile' ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4A82F7 0%, #7B5AF7 100%)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff',
                    letterSpacing: '-0.5px',
                  }}>
                    АА
                  </div>
                ) : key === '/notifications' ? (
                  <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ fontSize: 15, color: '#9B9C9E' }} />
                    {unreadCount > 0 && (
                      <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: '#F04438', borderRadius: '50%' }} />
                    )}
                  </div>
                ) : (
                  <span style={iconStyle}><Icon /></span>
                )}
                {!collapsed && <span style={labelStyle}>{label}</span>}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
