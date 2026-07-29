import { create } from 'zustand';
import { recordAudit } from '../lib/audit';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'barometer-theme';

function readInitial(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/**
 * Общие тема-зависимые поверхности приложения (вне antd-токенов).
 * ВАЖНО: тёмные значения оставлены ровно как были — тёмная тема не меняется
 * визуально; добавлена только светлая ветка.
 */
export function appSurfaces(isDark: boolean) {
  return {
    outer:  isDark ? '#000'     : '#EFEFF2', // внешний фон приложения
    card:   isDark ? '#121214'  : '#FFFFFF', // основная карточка контента
    panel:  isDark ? '#16171a'  : '#F7F7F9', // вторичная панель/карточка
    inner:  isDark ? '#1e1f22'  : '#EEEEF1', // вложенная поверхность/чип
    raised: isDark ? '#1a1b1e'  : '#FFFFFF', // приподнятый слой
    border: isDark ? '#2D2E30'  : '#E3E3E6', // захардкоженные рамки
    // Оси/сетка кастомных SVG-графиков.
    axisText: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    axisTextDim: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.40)',
    grid: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)',
  };
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = readInitial();
  const persist = (mode: ThemeMode) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  };
  return {
    mode: initial,
    isDark: initial === 'dark',
    // Смена темы — единственное реально существующее изменение настройки
    // пользователя, поэтому здесь подключён аудит (требование ИБ). Остальные
    // разделы настроек пока заглушки; при их реализации вызов recordAudit
    // добавляется по этому образцу. Начальное чтение из localStorage аудитом
    // НЕ сопровождается — это не действие пользователя.
    setMode: (mode) => {
      const before = get().mode;
      persist(mode);
      set({ mode, isDark: mode === 'dark' });
      if (before !== mode) {
        recordAudit({ action: 'settings.theme.change', target: 'settings.theme', before, after: mode });
      }
    },
    toggle: () => {
      const before = get().mode;
      const mode: ThemeMode = before === 'dark' ? 'light' : 'dark';
      persist(mode);
      set({ mode, isDark: mode === 'dark' });
      recordAudit({ action: 'settings.theme.change', target: 'settings.theme', before, after: mode });
    },
  };
});
