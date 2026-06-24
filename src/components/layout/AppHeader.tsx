import { Bell, LogOut, Settings, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

interface AppHeaderProps {
  unreadCount: number;
}

export default function AppHeader({ unreadCount }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6 sticky top-0 z-50">
      <span className="text-lg font-bold text-primary whitespace-nowrap min-w-[120px]">
        ⬡ Барометр
      </span>

      <div className="flex-1 max-w-xl">
        <Input placeholder="Поиск задач, документов, метрик..." />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Уведомления">
            <Bell className="h-5 w-5" />
          </Button>
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground',
              )}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>
              <User />
              Профиль
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
