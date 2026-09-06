import { motion } from 'framer-motion';
import { RefreshCw, Wifi, Clock, Database, Cpu, Signal, Globe, HardDrive, MemoryStick } from 'lucide-react';
import { useSystemStatus } from '@/api/hooks';
import { Card, Button, Spinner, EmptyState, Badge } from '@/components/ui/primitives';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtBytes } from '@/lib/format';

function rssiQuality(rssi: number) {
  if (rssi >= -55) return { label: 'Excellent', pct: 100, tone: 'success' as const };
  if (rssi >= -65) return { label: 'Good', pct: 78, tone: 'success' as const };
  if (rssi >= -75) return { label: 'Fair', pct: 50, tone: 'warn' as const };
  return { label: 'Weak', pct: 26, tone: 'danger' as const };
}

function Meter({ pct, tone = 'success', left, right }: { pct: number; tone?: 'success' | 'warn' | 'danger'; left: string; right: string }) {
  return (
    <div className="sys-meter">
      <div className="sys-meter__bar">
        <motion.span
          className={`sys-meter__fill tone-${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="sys-meter__legend">
        <span className="mono">{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
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
  const mem = s.memory;

  const heapTotal = mem?.heap_total ?? s.free_heap * 1.7;
  const heapUsed = heapTotal - (mem?.heap_free ?? s.free_heap);
  const heapUsedPct = (heapUsed / heapTotal) * 100;
  const heapTone = heapUsedPct > 85 ? 'danger' : heapUsedPct > 70 ? 'warn' : 'success';

  const flashUsedPct = mem ? (mem.sketch_size / mem.flash_size) * 100 : 0;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Hardware</p>
          <h2 className="page-head__title">{s.device}</h2>
          <p className="page-head__sub mono">{s.datetime}</p>
        </div>
        <Button
          variant="subtle"
          icon={<RefreshCw size={16} className={status.isFetching ? 'spin' : ''} />}
          onClick={() => status.refetch()}
        >
          Refresh
        </Button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="sys-grid">
        {/* Wi-Fi */}
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Wifi size={16} /> <span>Wi-Fi</span>
              <Badge tone={s.wifi_connected ? 'success' : 'danger'} dot>
                {s.wifi_connected ? 'Connected' : 'Down'}
              </Badge>
            </div>
            <Meter pct={q.pct} tone={q.tone} left={`${s.rssi} dBm`} right={q.label} />
          </Card>
        </motion.div>

        {/* Time sync */}
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

        {/* Database */}
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Database size={16} /> <span>Database</span>
              <Badge tone={s.database === 'ok' ? 'success' : 'danger'} dot>
                {s.database.toUpperCase()}
              </Badge>
            </div>
            <p className="sys-card__dim">
              SQLite on-device. The UI never touches it directly — all access is through the REST API.
            </p>
          </Card>
        </motion.div>

        {/* Heap */}
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Cpu size={16} /> <span>Heap</span>
              <Badge tone={heapTone === 'success' ? 'success' : heapTone === 'warn' ? 'warn' : 'danger'} dot>
                {Math.round(heapUsedPct)}% used
              </Badge>
            </div>
            <Meter
              pct={heapUsedPct}
              tone={heapTone}
              left={`${fmtBytes(mem?.heap_free ?? s.free_heap)} free`}
              right={`of ${fmtBytes(heapTotal)}`}
            />
            {mem && (
              <ul className="kv kv--tight">
                <li><span>Largest free block</span><b className="mono">{fmtBytes(mem.heap_max_alloc)}</b></li>
                <li><span>Min free ever</span><b className="mono">{fmtBytes(mem.heap_min_free)}</b></li>
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Flash */}
        {mem && (
          <motion.div variants={riseItem}>
            <Card className="sys-card">
              <div className="sys-card__head">
                <HardDrive size={16} /> <span>Flash</span>
                <Badge tone="info" dot>{Math.round(flashUsedPct)}% sketch</Badge>
              </div>
              <Meter
                pct={flashUsedPct}
                tone={flashUsedPct > 90 ? 'danger' : flashUsedPct > 75 ? 'warn' : 'success'}
                left={`${fmtBytes(mem.sketch_size)} sketch`}
                right={`${fmtBytes(mem.flash_size)} total`}
              />
              <ul className="kv kv--tight">
                <li><span>Free for OTA</span><b className="mono">{fmtBytes(mem.sketch_free)}</b></li>
              </ul>
            </Card>
          </motion.div>
        )}

        {/* PSRAM */}
        {mem && (
          <motion.div variants={riseItem}>
            <Card className="sys-card">
              <div className="sys-card__head">
                <MemoryStick size={16} /> <span>PSRAM</span>
                <Badge tone={mem.psram_total > 0 ? 'success' : 'muted'} dot>
                  {mem.psram_total > 0 ? 'present' : 'none'}
                </Badge>
              </div>
              {mem.psram_total > 0 ? (
                <Meter
                  pct={((mem.psram_total - mem.psram_free) / mem.psram_total) * 100}
                  left={`${fmtBytes(mem.psram_free)} free`}
                  right={`of ${fmtBytes(mem.psram_total)}`}
                />
              ) : (
                <p className="sys-card__dim">No external PSRAM on this module.</p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Network */}
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Globe size={16} /> <span>Network</span>
            </div>
            <ul className="kv">
              <li><span>Hostname</span><b className="mono">{s.hostname}</b></li>
              <li><span>IP address</span><b className="mono">{s.ip}</b></li>
              <li><span>Signal</span><b className="mono">{s.rssi} dBm · {q.label}</b></li>
            </ul>
          </Card>
        </motion.div>

        {/* Polling */}
        <motion.div variants={riseItem}>
          <Card className="sys-card">
            <div className="sys-card__head">
              <Signal size={16} /> <span>Live polling</span>
              <Badge tone="info" dot>{status.isFetching ? 'updating' : 'every 15s'}</Badge>
            </div>
            <p className="sys-card__dim">
              This screen refreshes <span className="mono">/api/system/status</span> automatically. Last update{' '}
              <span className="mono">{s.datetime}</span>.
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
