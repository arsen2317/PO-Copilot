import {
  BookOpen,
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Дашборд' },
  { key: '/assistant', icon: <MessageSquare className="h-4 w-4" />, label: 'Ассистент' },
  { key: '/agents', icon: <Bot className="h-4 w-4" />, label: 'Агенты' },
  { key: '/services', icon: <Sparkles className="h-4 w-4" />, label: 'ИИ-сервисы' },
  { key: '/tasks', icon: <CheckSquare className="h-4 w-4" />, label: 'Задачи' },
  { key: '/rooms', icon: <Users className="h-4 w-4" />, label: 'Комнаты' },
  { key: '/knowledge', icon: <BookOpen className="h-4 w-4" />, label: 'База знаний' },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeKey: string =
    NAV_ITEMS.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key ??
    (location.pathname === '/' ? '/' : '');

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 border-r border-border bg-card transition-[width] duration-200 overflow-hidden',
        collapsed ? 'w-14' : 'w-[220px]',
      )}
    >
      {/* Навигация */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          const btn = (
            <button
              key={item.key}
              onClick={() => void navigate(item.key)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors rounded-none',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground border-l-2 border-transparent',
                collapsed && 'justify-center px-0',
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          );

          return collapsed ? (
            <Tooltip key={item.key} delayDuration={0}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            btn
          );
        })}
      </nav>

      {/* Кнопка «Создать» */}
      <div className={cn('border-t border-border p-3', collapsed ? 'flex justify-center' : '')}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button size="icon" className="w-8 h-8">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Создать</TooltipContent>
          </Tooltip>
        ) : (
          <Button size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        )}
      </div>

      {/* Кнопка сворачивания */}
      <div className="border-t border-border p-2 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
