import { create } from 'zustand';

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

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = readInitial();
  const persist = (mode: ThemeMode) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  };
  return {
    mode: initial,
    isDark: initial === 'dark',
    setMode: (mode) => {
      persist(mode);
      set({ mode, isDark: mode === 'dark' });
    },
    toggle: () => {
      const mode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
      persist(mode);
      set({ mode, isDark: mode === 'dark' });
    },
  };
});
