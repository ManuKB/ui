import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createLiveApi, type LiveApi } from '@/api/client';
import { mockApi, resetMockDb } from '@/api/mock';

export type DataMode = 'demo' | 'live';
export type ThemePref = 'dark' | 'light';

interface SettingsState {
  mode: DataMode;
  deviceUrl: string;
  theme: ThemePref;
}

interface SettingsContextValue extends SettingsState {
  api: LiveApi;
  setMode: (m: DataMode) => void;
  setDeviceUrl: (u: string) => void;
  toggleTheme: () => void;
  setTheme: (t: ThemePref) => void;
  resetDemoData: () => void;
}

const LS_KEY = 'savings-tracker:settings:v1';
const DEFAULT_URL = 'http://savings-esp32.local';

function load(): SettingsState {
  const base: SettingsState = {
    // Always start in demo mode — it works everywhere with no hardware.
    // Switch to "Live device" in Settings once a device URL is reachable.
    mode: 'demo',
    deviceUrl: DEFAULT_URL,
    theme: 'dark',
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

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const liveApi = useMemo(() => createLiveApi(() => state.deviceUrl), [state.deviceUrl]);
  const api = state.mode === 'demo' ? (mockApi as unknown as LiveApi) : liveApi;

  const setMode = useCallback((mode: DataMode) => setState((s) => ({ ...s, mode })), []);
  const setDeviceUrl = useCallback((deviceUrl: string) => setState((s) => ({ ...s, deviceUrl })), []);
  const setTheme = useCallback((theme: ThemePref) => setState((s) => ({ ...s, theme })), []);
  const toggleTheme = useCallback(
    () => setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })),
    [],
  );
  const resetDemoData = useCallback(() => resetMockDb(), []);

  const value: SettingsContextValue = {
    ...state,
    api,
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
