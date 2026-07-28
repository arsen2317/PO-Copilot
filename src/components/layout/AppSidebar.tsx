import { useState } from 'react';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  DownOutlined,
  LineChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { TokenCircleIcon } from '../icons';
import { Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
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
const MY_CLUSTER_ITEM = { key: '/my-cluster', icon: ApartmentOutlined, label: 'Мой кластер' } as const;

const NAV_ITEMS = [
  { key: '/metrics',    icon: LineChartOutlined,     label: 'Метрики' },
  { key: '/services',   icon: AppstoreOutlined,      label: 'ИИ-сервисы' },
  { key: '/tasks',      icon: CheckSquareOutlined,   label: 'Задачи' },
  { key: '/rooms',      icon: TeamOutlined,          label: 'Комнаты' },
  { key: '/knowledge',  icon: BookOutlined,          label: 'База знаний' },
] as const;

const BOTTOM_ITEMS = [
  { key: '/profile',       icon: UserOutlined,          label: 'Иванов И.И.' },
  { key: '/notifications', icon: BellOutlined,          label: 'Уведомления' },
  { key: '/settings',      icon: SettingOutlined,       label: 'Настройки' },
  { key: '__help__',       icon: QuestionCircleOutlined, label: 'Помощь' },
] as const;

export default function AppSidebar({ unreadCount }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Тема-зависимые цвета левого меню (антд-алгоритм не покрывает свой каркас).
  const C = {
    text: isDark ? '#9B9C9E' : '#4A4C52',
    textActive: isDark ? '#D7D8DA' : '#1A1B1E',
    hover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    active: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
  };

  const isAnalyticsActive =
    ANALYTICS_KEYS.has(location.pathname as '/dashboard') ||
    location.pathname.startsWith('/cjm');
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const selectedKey: string =
    [ASSISTANT_ITEM, MY_CLUSTER_ITEM, ...NAV_ITEMS].find((item) => {
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
        ? C.active
        : hoveredKey === key
          ? C.hover
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
    background: hoveredKey === key ? C.hover : 'transparent',
    transition: 'background 0.15s',
  });

  const iconStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    color: C.text,
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    color: C.text,
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
                <span style={{ color: C.textActive, fontSize: 15.55, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  PO Copilot
                </span>
              </div>
            )}
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                color: C.text, fontSize: 14, flexShrink: 0,
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
              <span style={iconStyle}><SearchOutlined /></span>
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
                <span style={{ ...labelStyle, color: ASSISTANT_ITEM.key === selectedKey ? C.textActive : C.text }}>
                  {ASSISTANT_ITEM.label}
                </span>
              )}
            </div>
          </Tooltip>

          {/* ── My Cluster ── */}
          <Tooltip title={collapsed ? MY_CLUSTER_ITEM.label : ''} placement="right">
            <div
              style={navItemStyle(MY_CLUSTER_ITEM.key)}
              onClick={() => handleNavClick(MY_CLUSTER_ITEM.key)}
              onMouseEnter={() => setHoveredKey(MY_CLUSTER_ITEM.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <span style={iconStyle}>
                <MY_CLUSTER_ITEM.icon />
              </span>
              {!collapsed && (
                <span style={{ ...labelStyle, color: MY_CLUSTER_ITEM.key === selectedKey ? C.textActive : C.text }}>
                  {MY_CLUSTER_ITEM.label}
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
                  ? C.active
                  : hoveredKey === '__analytics__'
                    ? C.hover
                    : 'transparent',
                transition: 'background 0.15s',
              }}
              onClick={handleAnalyticsGroupClick}
              onMouseEnter={() => setHoveredKey('__analytics__')}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 9.57, minWidth: 0 }}>
                <span style={{ ...iconStyle, color: isAnalyticsActive ? C.textActive : C.text }}>
                  <BarChartOutlined />
                </span>
                {!collapsed && (
                  <span style={{ ...labelStyle, color: isAnalyticsActive ? C.textActive : C.text }}>
                    Аналитика
                  </span>
                )}
              </div>
              {!collapsed && (
                <DownOutlined
                  style={{
                    fontSize: 10,
                    color: C.text,
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
                        ? C.active
                        : hoveredKey === `sub-${key}`
                          ? C.hover
                          : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? C.textActive : C.text,
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
                  <span style={{ ...labelStyle, color: key === selectedKey ? C.textActive : C.text }}>
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
            <div key={key} style={{ display: 'contents' }}>
              <Tooltip title={collapsed ? label : ''} placement="right">
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
                      ИИ
                    </div>
                  ) : key === '/notifications' ? (
                    <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon style={{ fontSize: 15, color: C.text }} />
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

              {/* ── Theme toggle — под профилем ── */}
              {key === '/profile' && (
                <Tooltip title={collapsed ? (isDark ? 'Светлая тема' : 'Тёмная тема') : ''} placement="right">
                  <div
                    style={bottomItemStyle('__theme__')}
                    onClick={toggleTheme}
                    onMouseEnter={() => setHoveredKey('__theme__')}
                    onMouseLeave={() => setHoveredKey(null)}
                  >
                    <span style={iconStyle}>{isDark ? <MoonOutlined /> : <BulbOutlined />}</span>
                    {!collapsed && (
                      <span style={labelStyle}>{isDark ? 'Тёмная тема' : 'Светлая тема'}</span>
                    )}
                  </div>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
