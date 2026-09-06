import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Wallet,
  Repeat,
  BellRing,
  TrendingUp,
  CircleCheckBig,
  Cpu,
  Activity,
} from 'lucide-react';
import { useAssets, useRecurring, usePendingRecurring, useSystemStatus } from '@/api/hooks';
import { Card, Badge, Spinner, Button } from '@/components/ui/primitives';
import { DonutChart, type DonutSlice } from '@/components/charts/DonutChart';
import { BarList } from '@/components/charts/BarRow';
import { AssetAvatar, ASSET_TYPE_META, StatusBadge } from '@/components/domain';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtMoney, fmtCompact, fmtDate, relativeDays } from '@/lib/format';
import type { AssetType } from '@/types/api';

export function Dashboard() {
  const assets = useAssets();
  const recurring = useRecurring();
  const pending = usePendingRecurring();
  const status = useSystemStatus({ poll: true });

  const model = useMemo(() => {
    const list = assets.data ?? [];
    const active = list.filter((a) => a.active);
    const netWorth = active.reduce((s, a) => s + a.amount, 0);

    const byType = new Map<AssetType, number>();
    for (const a of active) byType.set(a.type, (byType.get(a.type) ?? 0) + a.amount);

    const slices: DonutSlice[] = [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({ label: ASSET_TYPE_META[type].label, value, color: ASSET_TYPE_META[type].color }));

    const bars = [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({ label: ASSET_TYPE_META[type].label, value, color: ASSET_TYPE_META[type].color }));

    const interestBearing = active
      .filter((a) => a.interest_type !== 'NONE' && a.interest_rate > 0)
      .reduce((s, a) => s + (a.amount * a.interest_rate) / 100, 0);

    return {
      netWorth,
      activeCount: active.length,
      inactiveCount: list.length - active.length,
      slices,
      bars,
      projectedAnnualInterest: interestBearing,
      topAssets: [...active].sort((a, b) => b.amount - a.amount).slice(0, 5),
    };
  }, [assets.data]);

  const rules = recurring.data ?? [];
  const upcoming = useMemo(
    () =>
      [...rules]
        .filter((r) => r.active)
        .sort((a, b) => a.next_run.localeCompare(b.next_run))
        .slice(0, 6),
    [rules],
  );

  if (assets.isLoading) return <Spinner label="Loading portfolio…" />;

  const autoCount = rules.filter((r) => r.status === 'AUTO').length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="dash">
      {/* KPI ROW */}
      <div className="kpi-row">
        <motion.div variants={riseItem}>
          <Card className="kpi kpi--hero">
            <div className="kpi__top">
              <span className="kpi__label">Net worth · active assets</span>
              <Badge tone="cyan" dot>
                {model.activeCount} active
              </Badge>
            </div>
            <div className="kpi__value mono">{fmtMoney(model.netWorth)}</div>
            <div className="kpi__foot">
              <TrendingUp size={15} />
              <span>
                ~{fmtCompact(model.projectedAnnualInterest)} projected interest / yr
              </span>
            </div>
            <div className="kpi__spark" aria-hidden>
              {model.bars.map((b) => (
                <span key={b.label} style={{ background: b.color, flex: b.value || 0.001 }} />
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <StatTile icon={<Wallet size={18} />} label="Assets" value={`${assets.data?.length ?? 0}`} hint={`${model.inactiveCount} inactive`} to="/assets" accent="var(--brand-400)" />
        </motion.div>
        <motion.div variants={riseItem}>
          <StatTile icon={<Repeat size={18} />} label="Recurring rules" value={`${rules.length}`} hint={`${autoCount} automatic`} to="/recurring" accent="var(--accent-violet)" />
        </motion.div>
        <motion.div variants={riseItem}>
          <StatTile
            icon={<BellRing size={18} />}
            label="Pending actions"
            value={pending.isError ? '—' : `${pending.data?.length ?? 0}`}
            hint={pending.isError ? 'time not synced' : 'awaiting review'}
            to="/pending"
            accent="var(--accent-amber)"
            urgent={(pending.data?.length ?? 0) > 0}
          />
        </motion.div>
      </div>

      {/* MAIN GRID */}
      <div className="dash-grid">
        <motion.div variants={riseItem} className="dash-grid__span2">
          <Card className="panel">
            <header className="panel__head">
              <h2>Allocation by type</h2>
              <Link to="/assets" className="panel__link">
                All assets <ArrowUpRight size={14} />
              </Link>
            </header>
            <div className="alloc">
              <DonutChart
                data={model.slices}
                centerValue={fmtCompact(model.netWorth)}
                centerLabel="net worth"
              />
              <div className="alloc__legend">
                {model.slices.map((s) => (
                  <div key={s.label} className="alloc__row">
                    <span className="alloc__swatch" style={{ background: s.color }} />
                    <span className="alloc__name">{s.label}</span>
                    <span className="alloc__val mono">{fmtMoney(s.value)}</span>
                    <span className="alloc__pct">
                      {model.netWorth ? Math.round((s.value / model.netWorth) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="panel panel--device">
            <header className="panel__head">
              <h2>
                <Cpu size={16} /> Device
              </h2>
              <Link to="/system" className="panel__link">
                Details <ArrowUpRight size={14} />
              </Link>
            </header>
            {status.isLoading ? (
              <Spinner />
            ) : status.isError ? (
              <div className="device-off">
                <Activity size={18} />
                <p>No connection to the device.</p>
                <Button variant="subtle" size="sm" onClick={() => status.refetch()}>
                  Retry
                </Button>
              </div>
            ) : status.data ? (
              <ul className="device-list">
                <li>
                  <span>Wi-Fi</span>
                  <b>{status.data.wifi_connected ? `Connected · ${status.data.rssi} dBm` : 'Down'}</b>
                </li>
                <li>
                  <span>Host</span>
                  <b className="mono">{status.data.hostname}</b>
                </li>
                <li>
                  <span>IP</span>
                  <b className="mono">{status.data.ip}</b>
                </li>
                <li>
                  <span>Time sync</span>
                  <b>{status.data.time_synced ? 'Synced' : 'Not synced'}</b>
                </li>
                <li>
                  <span>Database</span>
                  <b className={status.data.database === 'ok' ? 'ok' : 'bad'}>{status.data.database}</b>
                </li>
                <li>
                  <span>Free heap</span>
                  <b className="mono">{(status.data.free_heap / 1024).toFixed(1)} KB</b>
                </li>
              </ul>
            ) : null}
          </Card>
        </motion.div>

        <motion.div variants={riseItem} className="dash-grid__span2">
          <Card className="panel">
            <header className="panel__head">
              <h2>Largest holdings</h2>
            </header>
            <BarList data={model.bars} />
          </Card>
        </motion.div>

        <motion.div variants={riseItem}>
          <Card className="panel">
            <header className="panel__head">
              <h2>Upcoming runs</h2>
              <Link to="/recurring" className="panel__link">
                All rules <ArrowUpRight size={14} />
              </Link>
            </header>
            {upcoming.length === 0 ? (
              <p className="panel__empty">No active recurring rules.</p>
            ) : (
              <ol className="timeline">
                {upcoming.map((r) => (
                  <li key={r.id} className="timeline__item">
                    <span className="timeline__dot" />
                    <div className="timeline__body">
                      <div className="timeline__row">
                        <b className="mono">{r.id}</b>
                        <StatusBadge status={r.status} />
                      </div>
                      <span className="timeline__meta">
                        {fmtDate(r.next_run)} · {relativeDays(r.next_run)} · {r.repeat_type}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </motion.div>

        <motion.div variants={riseItem} className="dash-grid__span3">
          <Card className="panel">
            <header className="panel__head">
              <h2>Top assets</h2>
              <span className="panel__hint">
                <CircleCheckBig size={14} /> {model.activeCount} active · {model.inactiveCount} inactive
              </span>
            </header>
            <div className="mini-assets">
              {model.topAssets.map((a) => (
                <Link to="/assets" key={a.id} className="mini-asset">
                  <AssetAvatar type={a.type} size={38} />
                  <div className="mini-asset__text">
                    <b>{a.name}</b>
                    <span>
                      {a.id} · {ASSET_TYPE_META[a.type].label}
                    </span>
                  </div>
                  <span className="mini-asset__amt mono">{fmtMoney(a.amount)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  to,
  accent,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  to: string;
  accent: string;
  urgent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`stat-tile ${urgent ? 'stat-tile--urgent' : ''}`}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <span className="stat-tile__icon">{icon}</span>
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value mono">{value}</span>
      <span className="stat-tile__hint">{hint}</span>
      <ArrowUpRight size={16} className="stat-tile__go" />
    </Link>
  );
}
