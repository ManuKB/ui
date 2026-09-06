import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Wallet } from 'lucide-react';
import { useAssets, useAssetMutations, useRecurring } from '@/api/hooks';
import { Card, Button, Badge, Spinner, EmptyState, Input, Segmented, IconButton } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AssetAvatar, AssetTypeIcon, ASSET_TYPE_META } from '@/components/domain';
import { AssetForm } from './forms/AssetForm';
import { stagger, riseItem } from '@/components/layout/Layout';
import { fmtMoney, fmtPct } from '@/lib/format';
import { ASSET_TYPES, MAX_ASSETS, type Asset, type AssetType } from '@/types/api';

type Filter = 'ALL' | AssetType;

export function AssetsPage() {
  const assets = useAssets();
  const recurring = useRecurring();
  const { remove } = useAssetMutations();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [toDelete, setToDelete] = useState<Asset | null>(null);

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of recurring.data ?? []) {
      if (!r.active) continue;
      s.add(r.asset_id);
      if (r.target_bank_id) s.add(r.target_bank_id);
    }
    return s;
  }, [recurring.data]);

  const rows = useMemo(() => {
    let list = assets.data ?? [];
    if (filter !== 'ALL') list = list.filter((a) => a.type === filter);
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter(
        (a) => a.id.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle) || (a.comment ?? '').toLowerCase().includes(needle),
      );
    return list;
  }, [assets.data, filter, q]);

  const total = rows.filter((a) => a.active).reduce((s, a) => s + a.amount, 0);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Asset) => {
    setEditing(a);
    setFormOpen(true);
  };

  if (assets.isLoading) return <Spinner label="Loading assets…" />;
  if (assets.isError)
    return <EmptyState icon={<Wallet size={28} />} title="Could not load assets" hint={(assets.error as Error).message} />;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Portfolio</p>
          <h2 className="page-head__title">Assets</h2>
          <p className="page-head__sub">
            {assets.data?.length ?? 0} of {MAX_ASSETS} · {fmtMoney(total)} shown
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew} disabled={(assets.data?.length ?? 0) >= MAX_ASSETS}>
          New asset
        </Button>
      </div>

      <Card className="toolbar">
        <div className="toolbar__search">
          <Search size={16} />
          <Input placeholder="Search id, name, note…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[{ value: 'ALL', label: 'All' }, ...ASSET_TYPES.map((t) => ({ value: t, label: t }))]}
        />
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="No assets match"
          hint="Adjust the filter or add a new asset."
          action={<Button icon={<Plus size={16} />} onClick={openNew}>New asset</Button>}
        />
      ) : (
        <>
          {/* desktop table */}
          <Card className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th className="ta-r">Amount</th>
                  <th className="ta-r">Rate</th>
                  <th>Interest</th>
                  <th>Update</th>
                  <th>Status</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <motion.tbody variants={stagger} initial="hidden" animate="show">
                {rows.map((a) => (
                  <motion.tr key={a.id} variants={riseItem} className={!a.active ? 'is-inactive' : ''}>
                    <td>
                      <div className="cell-asset">
                        <AssetAvatar type={a.type} size={34} />
                        <div>
                          <b>{a.name}</b>
                          <span className="mono">{a.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cell-type">
                        <AssetTypeIcon type={a.type} size={14} /> {ASSET_TYPE_META[a.type].label}
                      </span>
                    </td>
                    <td className="ta-r mono">{fmtMoney(a.amount)}</td>
                    <td className="ta-r mono">{a.interest_rate ? fmtPct(a.interest_rate) : '—'}</td>
                    <td>{a.interest_type === 'NONE' ? '—' : <Badge tone={a.interest_type === 'MONTHLY' ? 'info' : 'violet'}>{a.interest_type}</Badge>}</td>
                    <td>
                      <span className="dim">{a.update_type}</span>
                    </td>
                    <td>
                      {a.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <IconButton label="Edit" onClick={() => openEdit(a)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label={usedIds.has(a.id) ? 'In use by a rule' : 'Delete'}
                          disabled={usedIds.has(a.id)}
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </Card>

          {/* mobile cards */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="asset-cards">
            {rows.map((a) => (
              <motion.div key={a.id} variants={riseItem}>
                <Card className={`asset-card ${!a.active ? 'is-inactive' : ''}`}>
                  <div className="asset-card__head">
                    <AssetAvatar type={a.type} size={40} />
                    <div className="asset-card__id">
                      <b>{a.name}</b>
                      <span className="mono">{a.id} · {ASSET_TYPE_META[a.type].label}</span>
                    </div>
                    {a.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>}
                  </div>
                  <div className="asset-card__amt mono">{fmtMoney(a.amount)}</div>
                  <div className="asset-card__meta">
                    <span>{a.interest_type === 'NONE' ? 'No interest' : `${a.interest_type} · ${fmtPct(a.interest_rate)}`}</span>
                    <span className="dim">{a.update_type}</span>
                  </div>
                  {a.comment && <p className="asset-card__note">{a.comment}</p>}
                  <div className="asset-card__actions">
                    <Button variant="subtle" size="sm" icon={<Pencil size={14} />} onClick={() => openEdit(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      disabled={usedIds.has(a.id)}
                      onClick={() => setToDelete(a)}
                    >
                      {usedIds.has(a.id) ? 'In use' : 'Delete'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      <AssetForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={remove.isPending}
        title={`Delete ${toDelete?.id}?`}
        message={
          <>
            <b>{toDelete?.name}</b> will be permanently removed from the device. This cannot be undone.
          </>
        }
        confirmLabel="Delete asset"
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
