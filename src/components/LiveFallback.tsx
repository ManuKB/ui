import { useEffect, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useSystemStatus } from '@/api/hooks';
import { toast } from '@/components/ui/toast';

/**
 * When the app is pointed at a live device that cannot be reached (common on the
 * hosted build, or off the LAN), silently fall back to demo/test data — unless
 * the user explicitly chose "Live" in Settings.
 */
export function LiveFallback() {
  const { mode, liveIntent, deviceUrl, setMode } = useSettings();
  const status = useSystemStatus({ poll: true });
  const done = useRef(false);

  useEffect(() => {
    if (mode !== 'live') {
      done.current = false;
      return;
    }
    if (liveIntent || done.current) return;
    if (status.isError && status.isFetched) {
      done.current = true;
      setMode('demo');
      toast.warn('Live device unreachable', `Couldn't reach ${deviceUrl} — showing demo data. Re-enable in Settings.`);
    }
  }, [mode, liveIntent, status.isError, status.isFetched, deviceUrl, setMode]);

  return null;
}
