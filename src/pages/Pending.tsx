import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Play, SkipForward, Zap, Clock, CheckCircle2, CalendarClock, ChevronRight, TriangleAlert } from 'lucide-react';
import {
  useAssetSchedules,
  useAssets,
  usePendingRecurring,
  useRecurringMutations,
  useSystemStatus,
} from '@/api/hooks';
import { Card, Button, Spinner, Badge } from '@/components/ui/primitives';
import { AssetAvatar, StatusBadge, ASSET_TYPE_META } from '@/components/domain';
import { ProcessResultDialog } from './ProcessResultDialog';
import { AssetForm } from './forms/AssetForm';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtDate, fmtMoney, relativeDays } from '@/lib/format';
import { maturityAlerts, type MaturityItem } from '@/lib/prediction';
import { ApiError, type Asset, type ProcessResult } from '@/types/api';

const MATURITY_WINDOW_MONTHS = 3;

function MaturityRow({ item, overdue, onOpen }: { item: MaturityItem; overdue?: boolean; onOpen: (a: Asset) => void }) {
  const { asset, expiry, daysLeft, maturityValue } = item;
  const tone = overdue ? 'danger' : daysLeft <= 14 ? 'warn' : 'info';
  return (
    <motion.button
      variants={riseItem}
      type="button"
      className={`maturity-row ${overdue ? 'maturity-row--overdue' : ''}`}
      onClick={() => onOpen(asset)}
    >
      <AssetAvatar type={asset.type} size={38} />
      <span className="maturity-row__mid">
        <span className="maturity-row__name">{asset.name}</span>
        <span className="maturity-row__meta">
          <span className="mono">{asset.id}</span> · {ASSET_TYPE_META[asset.type].label} · {fmtDate(expiry)}
        </span>
      </span>
      <span className="maturity-row__right">
        <span className="maturity-row__value mono">{fmtMoney(maturityValue)}</span>
        <Badge tone={tone} dot>
          {overdue ? `Matured ${relativeDays(expiry)}` : relativeDays(expiry)}
        </Badge>
      </span>
      <ChevronRight size={16} className="maturity-row__go" />
    </motion.button>
  );
}

export function PendingPage() {
  const pending = usePendingRecurring();
  const status = useSystemStatus();
  const assets = useAssets();
  const schedules = useAssetSchedules();
  const { process, skip, setAuto } = useRecurringMutations();
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [editing, setEditing] = useState<Asset | null>(null);

  const assetName = (id: string) => assets.data?.find((a) => a.id === id)?.name ?? id;

  const maturity = useMemo(
    () => (assets.data && schedules.data ? maturityAlerts(assets.data, schedules.data, undefined, MATURITY_WINDOW_MONTHS) : null),
    [assets.data, schedules.data],
  );

  const timeNotSynced =
    (pending.error instanceof ApiError && pending.error.code === 'TIME_NOT_SYNCED') ||
    (status.data && !status.data.time_synced);

  const rows = pending.data ?? [];
  const upcomingCount = (maturity?.upcoming.length ?? 0) + (maturity?.matured.length ?? 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Inbox</p>
          <h2 className="page-head__title">Pending actions</h2>
          <p className="page-head__sub">
            {upcomingCount} maturit{upcomingCount === 1 ? 'y' : 'ies'} · {rows.length} decision{rows.length === 1 ? '' : 's'} waiting
          </p>
        </div>
      </div>

      {/* ---------- 1. Upcoming maturities ---------- */}
      <section className="pending-section">
        <header className="pending-section__head">
          <h3>
            <CalendarClock size={16} /> Upcoming maturities
          </h3>
          <span className="panel__hint">next {MATURITY_WINDOW_MONTHS} months</span>
        </header>

        {assets.isLoading || schedules.isLoading ? (
          <Spinner label="Checking maturities…" />
        ) : !maturity ? (
          <div className="pending-note">
            <TriangleAlert size={16} /> Could not load asset maturities.
          </div>
        ) : (
          <>
            {maturity.matured.length > 0 && (
              <div className="maturity-group maturity-group--overdue">
                <p className="maturity-group__title">
                  <TriangleAlert size={14} /> Matured, still active — needs attention
                </p>
                <motion.div variants={stagger} initial="hidden" animate="show" className="maturity-list">
                  {maturity.matured.map((m) => (
                    <MaturityRow key={m.asset.id} item={m} overdue onOpen={setEditing} />
                  ))}
                </motion.div>
              </div>
            )}

            {maturity.upcoming.length > 0 ? (
              <motion.div variants={stagger} initial="hidden" animate="show" className="maturity-list">
                {maturity.upcoming.map((m) => (
                  <MaturityRow key={m.asset.id} item={m} onOpen={setEditing} />
                ))}
              </motion.div>
            ) : (
              <div className="pending-note">
                <CheckCircle2 size={16} /> Nothing matures in the next {MATURITY_WINDOW_MONTHS} months.
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------- 2. Pending decisions ---------- */}
      <section className="pending-section">
        <header className="pending-section__head">
          <h3>
            <BellRing size={16} /> Pending decisions
          </h3>
          {rows.length > 0 && <span className="panel__hint">{rows.length} waiting</span>}
        </header>

        {pending.isLoading ? (
          <Spinner label="Checking pending occurrences…" />
        ) : timeNotSynced ? (
          <div className="pending-note pending-note--warn">
            <Clock size={16} />
            <span>Device time not synchronised — the firmware holds date-sensitive work until the clock is set.</span>
            <Button variant="subtle" size="sm" onClick={() => pending.refetch()}>
              Check again
            </Button>
          </div>
        ) : pending.isError ? (
          <div className="pending-note pending-note--warn">
            <TriangleAlert size={16} /> {(pending.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="pending-note">
            <CheckCircle2 size={16} /> No recurring rule is waiting for a decision.
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="pending-list">
            {rows.map((r) => (
              <motion.div key={r.id} variants={riseItem}>
                <Card className={`pending-card status-${r.status.toLowerCase()}`}>
                  <div className="pending-card__head">
                    <div>
                      <div className="pending-card__title">
                        <b className="mono">{r.id}</b>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="pending-card__asset">
                        {r.asset_name ?? assetName(r.asset_id)} <span className="mono dim">({r.asset_id})</span>
                      </p>
                    </div>
                    <div className="pending-card__due">
                      <span className="dim">Due</span>
                      <b>{fmtDate(r.next_run)}</b>
                      <span className="dim">{relativeDays(r.next_run)}</span>
                    </div>
                  </div>

                  <div className="pending-card__flow">
                    <span className="chip">{r.repeat_type}</span>
                    <span className="chip chip--ghost">{r.interest_mode}</span>
                    <span className="chip">
                      {r.target_bank_id ? `→ ${r.target_bank_id} · ${assetName(r.target_bank_id)}` : '→ compounds in place'}
                    </span>
                  </div>

                  <div className="pending-card__actions">
                    <Button
                      variant="success"
                      icon={<Play size={15} />}
                      loading={process.isPending && process.variables === r.id}
                      onClick={async () => {
                        try {
                          setResult(await process.mutateAsync(r.id));
                        } catch {
                          /* toast */
                        }
                      }}
                    >
                      Process now
                    </Button>
                    <Button
                      variant="subtle"
                      icon={<SkipForward size={15} />}
                      loading={skip.isPending && skip.variables === r.id}
                      onClick={() => skip.mutate(r.id)}
                    >
                      Skip
                    </Button>
                    <Button
                      variant="ghost"
                      icon={<Zap size={15} />}
                      loading={setAuto.isPending && setAuto.variables?.id === r.id}
                      onClick={() => setAuto.mutate({ id: r.id, auto: true })}
                    >
                      Make automatic
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <ProcessResultDialog result={result} assetName={assetName} onClose={() => setResult(null)} />
      <AssetForm open={!!editing} onClose={() => setEditing(null)} editing={editing} />
    </div>
  );
}
