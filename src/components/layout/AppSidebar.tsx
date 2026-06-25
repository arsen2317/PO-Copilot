import { useState } from 'react';
import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchModal from './SearchModal';

interface AppSidebarProps {
  unreadCount: number;
}

const NAV_ITEMS = [
  { key: '__search__', icon: SearchOutlined, label: 'Поиск' },
  { key: '/assistant', icon: MessageOutlined, label: 'Ассистент' },
  { key: '/', icon: DashboardOutlined, label: 'Дашборд' },
  { key: '/services', icon: AppstoreOutlined, label: 'ИИ-сервисы' },
  { key: '/tasks', icon: CheckSquareOutlined, label: 'Задачи' },
  { key: '/rooms', icon: TeamOutlined, label: 'Комнаты' },
  { key: '/knowledge', icon: BookOutlined, label: 'База знаний' },
] as const;

const BOTTOM_ITEMS = [
  { key: '/profile', icon: UserOutlined, label: 'Профиль' },
  { key: '/notifications', icon: BellOutlined, label: 'Уведомления' },
  { key: '/settings', icon: SettingOutlined, label: 'Настройки' },
  { key: '__help__', icon: QuestionCircleOutlined, label: 'Помощь' },
] as const;

export default function AppSidebar({ unreadCount }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const selectedKey: string =
    NAV_ITEMS.find((item) => {
      const k = item.key as string;
      return k !== '/' && k !== '__search__' && location.pathname.startsWith(k);
    })?.key as string | undefined ?? (location.pathname === '/' ? '/' : '');

  const handleNavClick = (key: string) => {
    if (key === '__search__') { setSearchOpen(true); return; }
    if (key === '__help__') return;
    void navigate(key);
  };

  const navItemStyle = (key: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9.57,
    height: 38,
    paddingLeft: 9.57,
    paddingRight: 9.57,
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
    gap: 8,
    height: 36,
    paddingLeft: 8,
    paddingRight: 8,
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
          width: 238,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: 12,
          overflow: 'hidden',
        }}
      >
        {/* ── Top: logo + nav ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9.57,
              padding: '20px 9.57px 16px',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                background: '#4A82F7',
                borderRadius: 4,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: '#D7D8DA',
                fontSize: 15.55,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              PO Copilot
            </span>
          </div>

          {/* Nav items */}
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              style={navItemStyle(key)}
              onClick={() => handleNavClick(key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <span style={iconStyle}>
                <Icon />
              </span>
              <span
                style={{
                  ...labelStyle,
                  color: key === selectedKey ? '#D7D8DA' : '#9B9C9E',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Bottom items ── */}
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 4 }}>
          {BOTTOM_ITEMS.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              style={bottomItemStyle(key)}
              onClick={() => handleNavClick(key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {key === '/profile' ? (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#4A82F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 12,
                    color: '#fff',
                  }}
                >
                  <UserOutlined />
                </div>
              ) : key === '/notifications' ? (
                <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ fontSize: 15, color: '#9B9C9E' }} />
                  {unreadCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0, right: 0,
                      width: 8, height: 8,
                      background: '#F04438',
                      borderRadius: '50%',
                    }} />
                  )}
                </div>
              ) : (
                <span style={iconStyle}>
                  <Icon />
                </span>
              )}
              <span style={labelStyle}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
