import { motion } from 'framer-motion';
import { RefreshCw, Wifi, Clock, Database, Cpu, Signal, Globe } from 'lucide-react';
import { useSystemStatus } from '@/api/hooks';
import { Card, Button, Spinner, EmptyState, Badge } from '@/components/ui/primitives';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtBytes } from '@/lib/format';

function rssiQuality(rssi: number) {
  if (rssi >= -55) return { label: 'Excellent', pct: 100, tone: 'success' as const };
  if (rssi >= -65) return { label: 'Good', pct: 75, tone: 'success' as const };
  if (rssi >= -75) return { label: 'Fair', pct: 50, tone: 'warn' as const };
  return { label: 'Weak', pct: 25, tone: 'danger' as const };
}

export function SystemPage() {
  const status = useSystemStatus({ poll: true });

  if (status.isLoading) return <Spinner label="Reading device status…" />;
  if (status.isError || !status.data)
    return (
      <EmptyState
        icon={<Cpu size={28} />}
        title="No connection to the device"
        hint={(status.error as Error)?.message ?? 'Check the device URL in Settings.'}
        action={<Button icon={<RefreshCw size={16} />} onClick={() => status.refetch()}>Retry</Button>}
      />
    );

  const s = status.data;
  const q = rssiQuality(s.rssi);
  const heapPct = Math.min(100, Math.round((s.free_heap / 320_000) * 100));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Hardware</p>
          <h2 className="page-head__title">{s.device}</h2>
          <p className="page-head__sub mono">{s.datetime}</p>
        </div>
        <Button variant="subtle" icon={<RefreshCw size={16} className={status.isFetching ? 'spin' : ''} />} onClick={() => status.refetch()}>
          Refresh
        </Button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="sys-grid">
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Wifi size={16} /> <span>Wi-Fi</span>
              <Badge tone={s.wifi_connected ? 'success' : 'danger'} dot>
                {s.wifi_connected ? 'Connected' : 'Down'}
              </Badge>
            </div>
            <div className="sys-meter">
              <div className="sys-meter__bar">
                <motion.span
                  className={`sys-meter__fill tone-${q.tone}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${q.pct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="sys-meter__legend">
                <span className="mono">{s.rssi} dBm</span>
                <span>{q.label}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Clock size={16} /> <span>Time sync</span>
              <Badge tone={s.time_synced ? 'success' : 'warn'} dot>
                {s.time_synced ? 'Synced' : 'Pending'}
              </Badge>
            </div>
            <p className="sys-card__big mono">{s.date}</p>
            <p className="sys-card__dim">
              {s.time_synced
                ? 'Date-sensitive rules can be processed.'
                : 'Pending actions & processing are blocked until NTP sync.'}
            </p>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Database size={16} /> <span>Database</span>
              <Badge tone={s.database === 'ok' ? 'success' : 'danger'} dot>
                {s.database.toUpperCase()}
              </Badge>
            </div>
            <p className="sys-card__dim">SQLite on-device. UI never touches it directly — all access is via the REST API.</p>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Cpu size={16} /> <span>Free heap</span>
            </div>
            <div className="sys-meter">
              <div className="sys-meter__bar">
                <motion.span
                  className="sys-meter__fill tone-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${heapPct}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
              <div className="sys-meter__legend">
                <span className="mono">{fmtBytes(s.free_heap)}</span>
                <span>~{heapPct}% of 320 KB</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Globe size={16} /> <span>Network</span>
            </div>
            <ul className="kv">
              <li><span>Hostname</span><b className="mono">{s.hostname}</b></li>
              <li><span>IP address</span><b className="mono">{s.ip}</b></li>
            </ul>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Signal size={16} /> <span>Live polling</span>
              <Badge tone="info" dot>{status.isFetching ? 'updating' : 'every 15s'}</Badge>
            </div>
            <p className="sys-card__dim">This screen refreshes device status automatically.</p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
