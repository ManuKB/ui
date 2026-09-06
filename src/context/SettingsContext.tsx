import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createLiveApi, type LiveApi } from '@/api/client';
import { mockApi, resetMockDb } from '@/api/mock';

export type DataMode = 'demo' | 'live';
export type ThemePref = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

interface SettingsState {
  mode: DataMode;
  deviceUrl: string;
  theme: ThemePref;
}

interface SettingsContextValue extends SettingsState {
  api: LiveApi;
  resolvedTheme: ResolvedTheme;
  setMode: (m: DataMode) => void;
  setDeviceUrl: (u: string) => void;
  toggleTheme: () => void;
  setTheme: (t: ThemePref) => void;
  resetDemoData: () => void;
}

const LS_KEY = 'savings-tracker:settings:v1';
const DEFAULT_URL = 'http://savings-esp32.local';

const systemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

function load(): SettingsState {
  const base: SettingsState = {
    // Demo mode works everywhere with no hardware; switch to "Live device" in Settings.
    mode: 'live',
    deviceUrl: DEFAULT_URL,
    // Follow the browser/OS theme until the user makes an explicit choice.
    theme: 'system',
  };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<SettingsState>) };
  } catch {
    /* ignore */
  }
  return base;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(load);
  const [osTheme, setOsTheme] = useState<ResolvedTheme>(systemTheme);

  // Track OS theme changes so `system` stays live.
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mql) return;
    const onChange = () => setOsTheme(mql.matches ? 'light' : 'dark');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = state.theme === 'system' ? osTheme : state.theme;

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const liveApi = useMemo(() => createLiveApi(() => state.deviceUrl), [state.deviceUrl]);
  const api = state.mode === 'demo' ? (mockApi as unknown as LiveApi) : liveApi;

  const setMode = useCallback((mode: DataMode) => setState((s) => ({ ...s, mode })), []);
  const setDeviceUrl = useCallback((deviceUrl: string) => setState((s) => ({ ...s, deviceUrl })), []);
  const setTheme = useCallback((theme: ThemePref) => setState((s) => ({ ...s, theme })), []);
  const toggleTheme = useCallback(
    () => setState((s) => ({ ...s, theme: (s.theme === 'system' ? osTheme : s.theme) === 'dark' ? 'light' : 'dark' })),
    [osTheme],
  );
  const resetDemoData = useCallback(() => resetMockDb(), []);

  const value: SettingsContextValue = {
    ...state,
    api,
    resolvedTheme,
    setMode,
    setDeviceUrl,
    toggleTheme,
    setTheme,
    resetDemoData,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
