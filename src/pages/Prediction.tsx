import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, Wallet, TrendingUp, PiggyBank, Users, ChevronRight, CalendarPlus } from 'lucide-react';
import { usePrediction } from '@/api/hooks';
import { Card, Spinner, EmptyState, Input, Badge } from '@/components/ui/primitives';
import { DonutChart, type DonutSlice } from '@/components/charts/DonutChart';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { AssetAvatar, ASSET_TYPE_META, InterestRateIcon } from '@/components/domain';
import { PredictionAssetDetail } from './PredictionAssetDetail';
import { AssetForm } from './forms/AssetForm';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtMoney, fmtCompact, fmtDate, todayISO } from '@/lib/format';
import { addMonthsISO } from '@/lib/recurring';
import type { AssetProjection } from '@/lib/prediction';
import type { Asset, AssetType } from '@/types/api';

function addYears(iso: string, years: number) {
  return addMonthsISO(iso, years * 12);
}

function statusBadge(p: AssetProjection) {
  if (p.matured) return <Badge tone="warn" dot>Matured</Badge>;
  if (p.gain <= 0) return <Badge tone="muted" dot>No interest</Badge>;
  return <Badge tone="success" dot>Growing</Badge>;
}

export function PredictionPage() {
  const today = todayISO();
  const [targetDate, setTargetDate] = useState(() => addYears(today, 1));
  const { projection, assets, isLoading, isError } = usePrediction(targetDate);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Asset | null>(null);

  const rows = useMemo(() => {
    if (!assets || !projection) return [];
    return assets
      .filter((a) => a.active)
      .map((a) => ({ asset: a, projection: projection.perAsset.get(a.id) as AssetProjection }))
      .filter((r) => r.projection)
      .sort((a, b) => b.projection.predicted - a.projection.predicted);
  }, [assets, projection]);

  const allocation: DonutSlice[] = useMemo(() => {
    if (!rows.length) return [];
    const byType = new Map<AssetType, number>();
    for (const { asset, projection: p } of rows) byType.set(asset.type, (byType.get(asset.type) ?? 0) + p.predicted);
    return [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({ label: ASSET_TYPE_META[type].label, value, color: ASSET_TYPE_META[type].color }));
  }, [rows]);

  if (isLoading) return <Spinner label="Projecting portfolio…" />;
  if (isError || !projection)
    return <EmptyState icon={<TrendingUp size={28} />} title="Could not build the projection" hint="Check your connection and try again." />;

  const t = projection.totals;
  const detailProjection = detailAsset ? (projection.perAsset.get(detailAsset.id) ?? null) : null;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Portfolio Overview</p>
          <h2 className="page-head__title">Prediction</h2>
          <p className="page-head__sub">Projected value on the selected date from each asset's annual rate — cumulative compounds, monthly pays out</p>
        </div>
        <label className="predict-datepick">
          <CalendarRange size={16} />
          <Input type="date" min={today} value={targetDate} onChange={(e) => e.target.value && setTargetDate(e.target.value)} />
        </label>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="predict-kpis">
        <motion.div variants={riseItem}>
          <PredictTile icon={<Wallet size={18} />} label="Total invested" value={fmtMoney(t.invested)} accent="var(--brand-400)" />
        </motion.div>
        <motion.div variants={riseItem}>
          <PredictTile
            icon={<TrendingUp size={18} />}
            label="Total interest / gain"
            value={`${t.gain >= 0 ? '+' : ''}${fmtMoney(t.gain)}`}
            accent="var(--accent-emerald)"
          />
        </motion.div>
        <motion.div variants={riseItem}>
          <PredictTile icon={<PiggyBank size={18} />} label="Predicted value" value={fmtMoney(t.predicted)} accent="var(--accent-violet)" />
        </motion.div>
        <motion.div variants={riseItem}>
          <PredictTile icon={<Users size={18} />} label="Active assets" value={`${t.activeCount} / ${assets?.length ?? 0}`} accent="var(--accent-cyan)" />
        </motion.div>
      </motion.div>

      <div className="dash-grid">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="dash-grid__span2">
          <Card className="panel">
            <header className="panel__head">
              <h2>Portfolio growth</h2>
              <span className="panel__hint">
                {fmtDate(projection.today)} → {fmtDate(targetDate)}
              </span>
            </header>
            <GrowthChart data={projection.timeline} />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="panel">
            <header className="panel__head">
              <h2>Predicted allocation</h2>
            </header>
            <div className="alloc alloc--stack">
              <DonutChart data={allocation} centerValue={fmtCompact(t.predicted)} centerLabel="predicted" size={150} thickness={18} />
              <div className="alloc__legend">
                {allocation.map((s) => (
                  <div key={s.label} className="alloc__row">
                    <span className="alloc__swatch" style={{ background: s.color }} />
                    <span className="alloc__name">{s.label}</span>
                    <span className="alloc__pct">{t.predicted ? Math.round((s.value / t.predicted) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="dash-grid__span3">
          <Card className="panel">
            <header className="panel__head">
              <h2>Assets ({rows.length} active)</h2>
            </header>

            {/* desktop table */}
            <table className="data-table predict-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th className="ta-r">Current value</th>
                  <th className="ta-r">Predicted value</th>
                  <th className="ta-r">Interest / gain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ asset, projection: p }) => (
                  <tr key={asset.id} className="predict-row" onClick={() => setDetailAsset(asset)}>
                    <td>
                      <div className="cell-asset">
                        <AssetAvatar type={asset.type} size={34} />
                        <div>
                          <b>{asset.name}</b>
                          <span className="mono">{asset.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cell-type">
                        <InterestRateIcon rate={asset.interest_rate} size={14} /> {ASSET_TYPE_META[asset.type].label}
                      </span>
                    </td>
                    <td className="ta-r mono">{fmtMoney(p.invested)}</td>
                    <td className="ta-r mono">{fmtMoney(p.predicted)}</td>
                    <td className="ta-r mono" style={{ color: p.gain > 0 ? 'var(--accent-emerald)' : undefined }}>
                      {p.gain > 0 ? '+' : ''}
                      {fmtMoney(p.gain)}
                    </td>
                    <td>{statusBadge(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobile tiles */}
            <div className="predict-tiles">
              {rows.map(({ asset, projection: p }) => (
                <button key={asset.id} type="button" className="predict-tile" onClick={() => setDetailAsset(asset)}>
                  <AssetAvatar type={asset.type} size={38} />
                  <div className="predict-tile__mid">
                    <span className="predict-tile__name">{asset.name}</span>
                    <span className="predict-tile__values">
                      <span className="mono dim">{fmtMoney(p.invested)}</span>
                      <ChevronRight size={12} className="dim" />
                      <span className="mono">{fmtMoney(p.predicted)}</span>
                    </span>
                  </div>
                  {statusBadge(p)}
                  <ChevronRight size={16} className="predict-tile__go" />
                </button>
              ))}
            </div>

            {rows.length === 0 && (
              <EmptyState
                icon={<CalendarPlus size={26} />}
                title="No active assets"
                hint="Add an asset to start projecting its value."
              />
            )}
          </Card>
        </motion.div>
      </div>

      <PredictionAssetDetail
        asset={detailAsset}
        projection={detailProjection}
        targetDate={targetDate}
        open={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        onSetSchedule={(a) => {
          setDetailAsset(null);
          setEditingSchedule(a);
        }}
      />
      <AssetForm open={!!editingSchedule} onClose={() => setEditingSchedule(null)} editing={editingSchedule} />
    </div>
  );
}

function PredictTile({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <Card className="predict-tile-kpi" style={{ '--accent': accent } as React.CSSProperties}>
      <span className="predict-tile-kpi__icon">{icon}</span>
      <span className="predict-tile-kpi__label">{label}</span>
      <span className="predict-tile-kpi__value mono">{value}</span>
    </Card>
  );
}
