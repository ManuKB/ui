import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, Wifi, WifiOff, FlaskConical, Radio } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useSystemStatus } from '@/api/hooks';
import { IconButton } from '@/components/ui/primitives';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/recurring': 'Recurring rules',
  '/pending': 'Pending actions',
  '/system': 'Device status',
  '/settings': 'Settings',
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme, mode } = useSettings();
  const status = useSystemStatus({ poll: true });

  const title =
    TITLES[pathname] ?? (pathname.startsWith('/assets') ? 'Assets' : pathname.startsWith('/recurring') ? 'Recurring rules' : 'Savings Tracker');

  const online = status.data?.wifi_connected;

  return (
    <header className="topbar">
      <div className="topbar__left">
        <IconButton label="Open menu" className="topbar__menu" onClick={onMenu}>
          <Menu size={20} />
        </IconButton>
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">
        <span className={`mode-chip mode-chip--${mode}`}>
          {mode === 'demo' ? <FlaskConical size={14} /> : <Radio size={14} />}
          {mode === 'demo' ? 'Demo data' : 'Live device'}
        </span>

        <span className={`conn-chip ${status.isError ? 'is-bad' : online ? 'is-ok' : 'is-idle'}`} title={status.isError ? 'No connection' : status.data?.hostname}>
          {status.isError ? <WifiOff size={14} /> : <Wifi size={14} />}
          {status.isError ? 'Offline' : status.data ? `${status.data.rssi} dBm` : '…'}
        </span>

        <IconButton label="Toggle theme" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
      </div>
    </header>
  );
}
