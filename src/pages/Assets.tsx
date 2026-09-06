import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Wallet, X, ChevronRight, Check } from 'lucide-react';
import { useAssets, useAssetMutations, useRecurring } from '@/api/hooks';
import { Card, Button, Badge, Spinner, EmptyState, Input, Segmented, IconButton, Fab } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AssetAvatar, AssetTypeIcon, ASSET_TYPE_META } from '@/components/domain';
import { AssetForm } from './forms/AssetForm';
import { AssetDetail } from './AssetDetail';
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
  const [detail, setDetail] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // leave multi-select once nothing is selected
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) setSelectionMode(false);
  }, [selectionMode, selectedIds]);

  const exitSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

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
  const selectedAssets = (assets.data ?? []).filter((a) => selectedIds.has(a.id));
  const selectedTotal = selectedAssets.reduce((s, a) => s + a.amount, 0);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            {rows.length} of {assets.data?.length ?? 0 } · {fmtMoney(total)} shown
          </p>
        </div>
        <div className="page-head__actions">
          {selectedIds.size > 0 && (
            <Button variant="subtle" size="sm" icon={<X size={15} />} onClick={exitSelection}>
              Clear selection
            </Button>
          )}
          <Button
            className="hide-on-mobile"
            icon={<Plus size={16} />}
            onClick={openNew}
            disabled={(assets.data?.length ?? 0) >= MAX_ASSETS}
          >
            New asset
          </Button>
        </div>
      </div>

      {selectedAssets.length > 0 && (
        <Card className="selection-summary">
          <span><b>{selectedAssets.length}</b> selected</span>
          <strong className="mono">{fmtMoney(selectedTotal)}</strong>
          <button className="selection-summary__clear" onClick={exitSelection} aria-label="Clear selection">
            <X size={15} />
          </button>
        </Card>
      )}

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
                  <th className="selection-col"><span className="visually-hidden">Select</span></th>
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
                    <td className="selection-col">
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.name}`}
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelected(a.id)}
                      />
                    </td>
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

          {/* mobile — compact tiles: tap for detail, press-and-hold to multi-select */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="asset-tiles">
            {rows.map((a) => (
              <AssetTile
                key={a.id}
                asset={a}
                selectionMode={selectionMode}
                selected={selectedIds.has(a.id)}
                onOpen={() => setDetail(a)}
                onToggle={() => toggleSelected(a.id)}
                onLongPress={() => {
                  setSelectionMode(true);
                  toggleSelected(a.id);
                }}
              />
            ))}
          </motion.div>
        </>
      )}

      {!selectionMode && (assets.data?.length ?? 0) < MAX_ASSETS && (
        <Fab label="New asset" icon={<Plus size={18} />} onClick={openNew} />
      )}

      <AssetDetail
        asset={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        inUse={detail ? usedIds.has(detail.id) : false}
        onEdit={(a) => {
          setDetail(null);
          openEdit(a);
        }}
        onDelete={(a) => {
          setDetail(null);
          setToDelete(a);
        }}
      />

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
            setSelectedIds((current) => {
              const next = new Set(current);
              next.delete(toDelete.id);
              return next;
            });
            setToDelete(null);
          } catch {
            /* toast */
          }
        }}
      />
    </div>
  );
}

const LONG_PRESS_MS = 420;

function AssetTile({
  asset,
  selectionMode,
  selected,
  onOpen,
  onToggle,
  onLongPress,
}: {
  asset: Asset;
  selectionMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const timer = useRef<number>();
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (selectionMode) return;
    fired.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(15);
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!timer.current || !origin.current) return;
    if (Math.abs(e.clientX - origin.current.x) > 10 || Math.abs(e.clientY - origin.current.y) > 10) clear();
  };

  const onClick = () => {
    if (fired.current) {
      fired.current = false;
      return; // long-press already handled it
    }
    if (selectionMode) onToggle();
    else onOpen();
  };

  return (
    <motion.button
      variants={riseItem}
      type="button"
      className={`asset-tile ${!asset.active ? 'is-inactive' : ''} ${selected ? 'is-selected' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={selectionMode ? selected : undefined}
    >
      {selectionMode ? (
        <span className={`asset-tile__check ${selected ? 'is-on' : ''}`} aria-hidden>
          {selected && <Check size={16} />}
        </span>
      ) : (
        <AssetAvatar type={asset.type} size={38} />
      )}
      <span className="asset-tile__name">{asset.name}</span>
      <span className="asset-tile__amt mono">{fmtMoney(asset.amount)}</span>
      {selectionMode ? <span className="asset-tile__gap" /> : <ChevronRight size={16} className="asset-tile__go" />}
    </motion.button>
  );
}
