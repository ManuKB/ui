import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Play, SkipForward, Repeat } from 'lucide-react';
import { useAssets, useRecurring, useRecurringMutations } from '@/api/hooks';
import { Card, Button, Spinner, EmptyState, Input, Segmented, IconButton, Toggle } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/domain';
import { RecurringForm } from './forms/RecurringForm';
import { ProcessResultDialog } from './ProcessResultDialog';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtDate, relativeDays } from '@/lib/format';
import { isPending } from '@/lib/recurring';
import type { ProcessResult, RecurringRule, RecurringStatus } from '@/types/api';

type Filter = 'ALL' | RecurringStatus;
const FILTERS: Filter[] = ['ALL', 'DUE', 'OVERDUE', 'SCHEDULED', 'AUTO', 'INACTIVE'];

export function RecurringPage() {
  const assets = useAssets();
  const recurring = useRecurring();
  const { remove, process, skip, setAuto } = useRecurringMutations();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [toDelete, setToDelete] = useState<RecurringRule | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const assetName = (id: string) => assets.data?.find((a) => a.id === id)?.name ?? id;

  const rows = useMemo(() => {
    let list = recurring.data ?? [];
    if (filter !== 'ALL') list = list.filter((r) => r.status === filter);
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(needle) ||
          r.asset_id.toLowerCase().includes(needle) ||
          assetName(r.asset_id).toLowerCase().includes(needle),
      );
    return list;
  }, [recurring.data, filter, q, assets.data]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const runProcess = async (r: RecurringRule) => {
    try {
      const res = await process.mutateAsync(r.id);
      setResult(res);
    } catch {
      /* toast */
    }
  };

  if (recurring.isLoading || assets.isLoading) return <Spinner label="Loading recurring rules…" />;
  if (recurring.isError)
    return <EmptyState icon={<Repeat size={28} />} title="Could not load rules" hint={(recurring.error as Error).message} />;

  const counts = (recurring.data ?? []).reduce<Record<string, number>>((m, r) => {
    m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, {});

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Automation</p>
          <h2 className="page-head__title">Recurring rules</h2>
          <p className="page-head__sub">
            {recurring.data?.length ?? 0} rules · {counts.DUE ?? 0} due · {counts.OVERDUE ?? 0} overdue
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>
          New rule
        </Button>
      </div>

      <Card className="toolbar">
        <div className="toolbar__search">
          <Search size={16} />
          <Input placeholder="Search id, asset…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f, label: f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase() }))}
        />
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<Repeat size={28} />} title="No rules match" hint="Adjust the filter or create a new rule." />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="rule-list">
          {rows.map((r) => {
            const pendingNow = isPending(r);
            return (
              <motion.div key={r.id} variants={riseItem}>
                <Card className={`rule-card status-${r.status.toLowerCase()}`}>
                  <div className="rule-card__main">
                    <div className="rule-card__title">
                      <b className="mono">{r.id}</b>
                      <StatusBadge status={r.status} />
                      <span className="rule-card__repeat">{r.repeat_type}</span>
                    </div>
                    <div className="rule-card__flow">
                      <span className="chip">{r.asset_id} · {assetName(r.asset_id)}</span>
                      <span className="flow-arrow">→</span>
                      <span className="chip">
                        {r.target_bank_id ? `${r.target_bank_id} · ${assetName(r.target_bank_id)}` : 'compounds in place'}
                      </span>
                      <span className="chip chip--ghost">{r.interest_mode}</span>
                    </div>
                    <div className="rule-card__meta">
                      <span>Next run <b>{fmtDate(r.next_run)}</b> ({relativeDays(r.next_run)})</span>
                      <span className="dim">Last run {fmtDate(r.last_run)}</span>
                      {r.comment && <span className="dim">· {r.comment}</span>}
                    </div>
                  </div>

                  <div className="rule-card__side">
                    <label className="auto-toggle">
                      <span>Auto</span>
                      <Toggle
                        checked={r.auto_enabled}
                        disabled={setAuto.isPending || !r.active}
                        onChange={(v) => setAuto.mutate({ id: r.id, auto: v })}
                        label={`Automatic processing for ${r.id}`}
                      />
                    </label>
                    <div className="rule-card__actions">
                      <Button
                        size="sm"
                        variant={pendingNow ? 'success' : 'subtle'}
                        icon={<Play size={14} />}
                        loading={process.isPending && process.variables === r.id}
                        disabled={!pendingNow}
                        onClick={() => runProcess(r)}
                      >
                        Process
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<SkipForward size={14} />}
                        loading={skip.isPending && skip.variables === r.id}
                        onClick={() => skip.mutate(r.id)}
                      >
                        Skip
                      </Button>
                      <IconButton label="Edit" onClick={() => { setEditing(r); setFormOpen(true); }}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton label="Delete" onClick={() => setToDelete(r)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <RecurringForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} assets={assets.data ?? []} />
      <ProcessResultDialog
        result={result}
        assetName={assetName}
        onClose={() => setResult(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={remove.isPending}
        title={`Delete ${toDelete?.id}?`}
        message={<>This recurring rule will be permanently removed. Balances are not affected.</>}
        confirmLabel="Delete rule"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            setToDelete(null);
          } catch {
            /* toast */
          }
        }}
      />
    </div>
  );
}
