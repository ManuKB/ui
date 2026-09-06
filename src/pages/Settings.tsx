import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Radio, Plug, RotateCcw, CheckCircle2, XCircle, Loader2, Sun, Moon } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Button, Field, Input, Segmented, Badge } from '@/components/ui/primitives';
import { toast } from '@/components/ui/toast';
import { createLiveApi } from '@/api/client';
import { stagger, riseItem } from '@/components/layout/Layout';
import { ApiError } from '@/types/api';

export function SettingsPage() {
  const { mode, setMode, deviceUrl, setDeviceUrl, theme, setTheme, resetDemoData } = useSettings();
  const qc = useQueryClient();
  const [urlDraft, setUrlDraft] = useState(deviceUrl);
  const [probe, setProbe] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [probeMsg, setProbeMsg] = useState('');

  const httpsToHttp = location.protocol === 'https:' && urlDraft.startsWith('http:');

  const save = () => {
    setDeviceUrl(urlDraft.trim());
    qc.invalidateQueries();
    toast.success('Device URL saved', urlDraft.trim());
  };

  const test = async () => {
    setProbe('testing');
    setProbeMsg('');
    try {
      const api = createLiveApi(() => urlDraft.trim());
      const s = await api.getSystemStatus();
      setProbe('ok');
      setProbeMsg(`${s.device} · ${s.hostname} · heap ${(s.free_heap / 1024).toFixed(0)} KB`);
    } catch (e) {
      setProbe('fail');
      setProbeMsg(e instanceof ApiError ? e.message : (e as Error).message);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="stack settings">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Configuration</p>
          <h2 className="page-head__title">Settings</h2>
          <p className="page-head__sub">Data source, device connection and appearance</p>
        </div>
      </div>

      <motion.div variants={riseItem}>
        <Card className="panel">
          <header className="panel__head">
            <h2>Data source</h2>
          </header>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              qc.invalidateQueries();
            }}
            options={[
              { value: 'demo', label: <><FlaskConical size={14} /> Demo data</> },
              { value: 'live', label: <><Radio size={14} /> Live device</> },
            ]}
          />
          <p className="settings__note">
            {mode === 'demo' ? (
              <>
                A full in-memory mock of the firmware API with a realistic dataset. All CRUD, processing and
                validation work and persist to <span className="mono">localStorage</span>. Nothing leaves your browser.
              </>
            ) : (
              <>
                Requests go to the real ESP32 at the URL below. The firmware must send{' '}
                <span className="mono">Access-Control-Allow-Origin</span> for the browser to accept responses.
              </>
            )}
          </p>
          {mode === 'demo' && (
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={() => { resetDemoData(); qc.invalidateQueries(); toast.info('Demo data reset'); }}>
              Reset demo data
            </Button>
          )}
        </Card>
      </motion.div>

      <motion.div variants={riseItem}>
        <Card className="panel">
          <header className="panel__head">
            <h2>Device connection</h2>
            <Badge tone={mode === 'live' ? 'success' : 'muted'} dot>
              {mode === 'live' ? 'in use' : 'inactive in demo mode'}
            </Badge>
          </header>
          <Field label="Device base URL" hint="mDNS hostname or direct IP — no trailing path">
            <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="http://savings-esp32.local" spellCheck={false} />
          </Field>

          <div className="settings__row">
            <Button onClick={save} icon={<Plug size={15} />}>Save URL</Button>
            <Button variant="subtle" onClick={test} disabled={probe === 'testing'}>
              {probe === 'testing' ? <Loader2 size={15} className="spin" /> : null} Test connection
            </Button>
          </div>

          {probe === 'ok' && (
            <p className="probe probe--ok"><CheckCircle2 size={15} /> {probeMsg}</p>
          )}
          {probe === 'fail' && (
            <p className="probe probe--fail"><XCircle size={15} /> {probeMsg}</p>
          )}

          {httpsToHttp && (
            <div className="callout callout--warn">
              <strong>Mixed content will block this.</strong>
              <p>
                This page is served over HTTPS (GitHub Pages), and browsers refuse HTTPS→HTTP requests to a
                plain-HTTP device. To use Live mode, either run this UI locally over <span className="mono">http://</span>,
                enable “Insecure content → Allow” for this site in your browser, or put a TLS reverse proxy in front of
                the ESP32. Demo mode needs none of this.
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={riseItem}>
        <Card className="panel">
          <header className="panel__head">
            <h2>Appearance</h2>
          </header>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: <><Moon size={14} /> Dark</> },
              { value: 'light', label: <><Sun size={14} /> Light</> },
            ]}
          />
        </Card>
      </motion.div>

      <motion.div variants={riseItem}>
        <Card className="panel panel--muted">
          <header className="panel__head"><h2>About</h2></header>
          <p className="settings__note">
            Client for the <b>ESP32 Personal Savings &amp; Asset Tracker API v1.0.0</b>. Limits enforced by the
            firmware: max 100 assets, max 100 recurring rules. Built with React, Vite, TanStack Query and Framer Motion.
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
