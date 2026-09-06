import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input } from '@/components/ui/primitives';
import { PasswordInput } from '@/components/ui/secret';
import { useMemoryMutations } from '@/api/hooks';
import type { MemoryEntry, MemoryInput } from '@/types/api';

type Draft = { id: string; entity: string; owner: string; name: string; key: string };
const empty: Draft = { id: '', entity: '', owner: '', name: '', key: '' };

export function MemoryForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: MemoryEntry | null;
}) {
  const { create, update } = useMemoryMutations();
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(editing ? { ...editing } : empty);
  }, [open, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = 'Name is required';
    if (draft.id.length > 64) e.id = 'Max 64 characters';
    if (draft.entity.length > 128) e.entity = 'Max 128 characters';
    if (draft.owner.length > 128) e.owner = 'Max 128 characters';
    if (draft.name.length > 128) e.name = 'Max 128 characters';
    if (draft.key.length > 256) e.key = 'Max 256 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload: MemoryInput = {
      entity: draft.entity.trim(),
      owner: draft.owner.trim(),
      name: draft.name.trim(),
      key: draft.key,
    };
    if (!editing && draft.id.trim()) payload.id = draft.id.trim();
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch {
      /* toast handled */
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.id}` : 'New memory row'}
      subtitle={editing ? editing.name : 'Store a labelled key / token'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            {editing ? 'Save changes' : 'Create row'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="ID" error={errors.id} hint={editing ? 'ID cannot be changed' : 'Optional — device generates mem_… when blank'}>
          <Input value={draft.id} disabled={!!editing} maxLength={64} placeholder="mem_… (auto)" onChange={(e) => set('id', e.target.value)} />
        </Field>

        <Field label="Name" required error={errors.name} hint="Label / attribute name">
          <Input value={draft.name} maxLength={128} placeholder="net_banking_pin" onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label="Entity" error={errors.entity} hint="Free-form category, e.g. asset / device / user">
          <Input value={draft.entity} maxLength={128} placeholder="asset" onChange={(e) => set('entity', e.target.value)} />
        </Field>

        <Field label="Owner" error={errors.owner} hint="Free-form owner reference, e.g. an asset id">
          <Input value={draft.owner} maxLength={128} placeholder="A001" onChange={(e) => set('owner', e.target.value)} />
        </Field>

        <Field label="Key (stored value)" error={errors.key} hint="The secret value / token — hidden by default">
          <PasswordInput
            value={draft.key}
            showCopy
            maxLength={256}
            placeholder="••••••••"
            onChange={(e) => set('key', (e.target as HTMLInputElement).value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
