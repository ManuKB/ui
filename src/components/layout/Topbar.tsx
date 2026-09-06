import { useLocation } from 'react-router-dom';
import { Moon, Sun, Wifi, WifiOff, FlaskConical, Radio } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useSystemStatus } from '@/api/hooks';
import { IconButton } from '@/components/ui/primitives';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/recurring': 'Recurring rules',
  '/pending': 'Pending actions',
  '/memory': 'Memory',
  '/system': 'Device status',
  '/settings': 'Settings',
};

export function Topbar() {
  const { pathname } = useLocation();
  const { resolvedTheme, toggleTheme, mode } = useSettings();
  const status = useSystemStatus({ poll: true });

  const title =
    TITLES[pathname] ?? (pathname.startsWith('/assets') ? 'Assets' : pathname.startsWith('/recurring') ? 'Recurring rules' : 'Savings Tracker');

  const online = status.data?.wifi_connected;

  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="26" height="26">
            <rect width="32" height="32" rx="9" fill="url(#tlg)" />
            <path d="M8 20l5-7 4 3 7-10" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="tlg" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">
        <span className={`mode-chip mode-chip--${mode}`}>
          {mode === 'demo' ? <FlaskConical size={14} /> : <Radio size={14} />}
          <span className="mode-chip__txt">{mode === 'demo' ? 'Demo data' : 'Live device'}</span>
        </span>

        <span
          className={`conn-chip ${status.isError ? 'is-bad' : online ? 'is-ok' : 'is-idle'}`}
          title={status.isError ? 'No connection' : status.data?.hostname}
        >
          {status.isError ? <WifiOff size={14} /> : <Wifi size={14} />}
          {status.isError ? 'Offline' : status.data ? `${status.data.rssi} dBm` : '…'}
        </span>

        <IconButton label="Toggle theme" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
      </div>
    </header>
  );
}
