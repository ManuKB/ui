import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, KeyRound, Lock } from 'lucide-react';
import { useMemory, useMemoryMutations } from '@/api/hooks';
import { Card, Button, Badge, Spinner, EmptyState, Input, Segmented, IconButton, Fab } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SecretText } from '@/components/ui/secret';
import { MemoryForm } from './forms/MemoryForm';
import { MemoryGate } from './memory/MemoryGate';
import { stagger, riseItem } from '@/components/layout/Layout';
import { MAX_MEMORY, type MemoryEntry } from '@/types/api';

export function MemoryPage() {
  return (
    <MemoryGate>
      <MemoryList />
    </MemoryGate>
  );
}

function MemoryList() {
  const memory = useMemory();
  const { remove } = useMemoryMutations();

  const [q, setQ] = useState('');
  const [entity, setEntity] = useState<string>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryEntry | null>(null);
  const [toDelete, setToDelete] = useState<MemoryEntry | null>(null);

  const entities = useMemo(() => {
    const s = new Set<string>();
    for (const m of memory.data ?? []) if (m.entity) s.add(m.entity);
    return ['ALL', ...[...s].sort()];
  }, [memory.data]);

  const rows = useMemo(() => {
    let list = memory.data ?? [];
    if (entity !== 'ALL') list = list.filter((m) => m.entity === entity);
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(needle) ||
          m.name.toLowerCase().includes(needle) ||
          m.owner.toLowerCase().includes(needle) ||
          m.entity.toLowerCase().includes(needle),
      );
    return list;
  }, [memory.data, entity, q]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: MemoryEntry) => {
    setEditing(m);
    setFormOpen(true);
  };

  const relock = () => {
    try {
      sessionStorage.removeItem('savings-tracker:memory-unlocked');
    } catch {
      /* ignore */
    }
    location.reload();
  };

  if (memory.isLoading) return <Spinner label="Loading secure store…" />;
  if (memory.isError)
    return <EmptyState icon={<KeyRound size={28} />} title="Could not load memory rows" hint={(memory.error as Error).message} />;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Restricted</p>
          <h2 className="page-head__title">Memory</h2>
          <p className="page-head__sub">
            {memory.data?.length ?? 0} of {MAX_MEMORY} rows · secure key / label store
          </p>
        </div>
        <div className="settings__row">
          <Button variant="ghost" size="sm" icon={<Lock size={14} />} onClick={relock}>
            Lock
          </Button>
          <Button
            className="hide-on-mobile"
            icon={<Plus size={16} />}
            onClick={openNew}
            disabled={(memory.data?.length ?? 0) >= MAX_MEMORY}
          >
            New row
          </Button>
        </div>
      </div>

      <Card className="toolbar">
        <div className="toolbar__search">
          <Search size={16} />
          <Input placeholder="Search id, name, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented value={entity} onChange={setEntity} options={entities.map((e) => ({ value: e, label: e === 'ALL' ? 'All' : e }))} />
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={28} />}
          title="No rows match"
          hint="Adjust the filter or add a new row."
          action={<Button icon={<Plus size={16} />} onClick={openNew}>New row</Button>}
        />
      ) : (
        <>
          <Card className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Entity</th>
                  <th>Owner</th>
                  <th>Name</th>
                  <th>Password</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <motion.tbody variants={stagger} initial="hidden" animate="show">
                {rows.map((m) => (
                  <motion.tr key={m.id} variants={riseItem}>
                    <td className="mono dim">{m.id}</td>
                    <td>{m.entity ? <Badge tone="violet">{m.entity}</Badge> : <span className="dim">—</span>}</td>
                    <td className="mono">{m.owner || <span className="dim">—</span>}</td>
                    <td><b>{m.name}</b></td>
                    <td><SecretText value={m.key} label={m.name || 'key'} /></td>
                    <td>
                      <div className="row-actions">
                        <IconButton label="Edit" onClick={() => openEdit(m)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Delete" onClick={() => setToDelete(m)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </Card>

          <motion.div variants={stagger} initial="hidden" animate="show" className="asset-cards">
            {rows.map((m) => (
              <motion.div key={m.id} variants={riseItem}>
                <Card className="asset-card">
                  <div className="asset-card__head">
                    <span className="asset-avatar" style={{ width: 40, height: 40, color: 'var(--accent-violet)', background: 'color-mix(in srgb, var(--accent-violet) 16%, transparent)' }}>
                      <KeyRound size={18} />
                    </span>
                    <div className="asset-card__id">
                      <b>{m.name}</b>
                      <span className="mono">{m.id}</span>
                    </div>
                    {m.entity && <Badge tone="violet">{m.entity}</Badge>}
                  </div>
                  <div className="asset-card__meta">
                    <span className="dim">Owner</span>
                    <span className="mono">{m.owner || '—'}</span>
                  </div>
                  <div className="mem-card__key">
                    <span className="field__label">Password</span>
                    <SecretText value={m.key} label={m.name || 'key'} />
                  </div>
                  <div className="asset-card__actions">
                    <Button variant="subtle" size="sm" icon={<Pencil size={14} />} onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setToDelete(m)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      {(memory.data?.length ?? 0) < MAX_MEMORY && <Fab label="New row" icon={<Plus size={18} />} onClick={openNew} />}

      <MemoryForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={remove.isPending}
        title={`Delete ${toDelete?.id}?`}
        message={
          <>
            <b>{toDelete?.name}</b> and its stored value will be permanently removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete row"
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
