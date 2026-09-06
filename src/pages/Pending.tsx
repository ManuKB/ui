import { useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Play, SkipForward, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { usePendingRecurring, useRecurringMutations, useSystemStatus } from '@/api/hooks';
import { Card, Button, Spinner, EmptyState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/domain';
import { ProcessResultDialog } from './ProcessResultDialog';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtDate, relativeDays } from '@/lib/format';
import { ApiError, type ProcessResult } from '@/types/api';
import { useAssets } from '@/api/hooks';

export function PendingPage() {
  const pending = usePendingRecurring();
  const status = useSystemStatus();
  const assets = useAssets();
  const { process, skip, setAuto } = useRecurringMutations();
  const [result, setResult] = useState<ProcessResult | null>(null);

  const assetName = (id: string) => assets.data?.find((a) => a.id === id)?.name ?? id;

  const timeNotSynced =
    (pending.error instanceof ApiError && pending.error.code === 'TIME_NOT_SYNCED') ||
    (status.data && !status.data.time_synced);

  if (pending.isLoading) return <Spinner label="Checking pending occurrences…" />;

  if (timeNotSynced)
    return (
      <EmptyState
        icon={<Clock size={28} />}
        title="Device time not synchronised"
        hint="The firmware refuses date-sensitive work until NTP sync completes. Pending actions will appear once the clock is set."
        action={<Button variant="subtle" onClick={() => pending.refetch()}>Check again</Button>}
      />
    );

  if (pending.isError)
    return <EmptyState icon={<BellRing size={28} />} title="Could not load pending actions" hint={(pending.error as Error).message} />;

  const rows = pending.data ?? [];

  if (rows.length === 0)
    return (
      <EmptyState
        icon={<CheckCircle2 size={28} />}
        title="All caught up"
        hint="No recurring rule is waiting for a decision. Due occurrences on automatic rules are handled by the device."
      />
    );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Inbox</p>
          <h2 className="page-head__title">Pending actions</h2>
          <p className="page-head__sub">
            {rows.length} occurrence{rows.length > 1 ? 's' : ''} {rows.length > 1 ? 'need' : 'needs'} a decision
          </p>
        </div>
      </div>

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

      <ProcessResultDialog result={result} assetName={assetName} onClose={() => setResult(null)} />
    </div>
  );
}
