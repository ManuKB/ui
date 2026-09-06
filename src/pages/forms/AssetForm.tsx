import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, Textarea, Toggle } from '@/components/ui/primitives';
import { AssetTypeIcon } from '@/components/domain';
import {
  ASSET_TYPES,
  INTEREST_TYPES,
  UPDATE_TYPES,
  type Asset,
  type AssetInput,
  type AssetType,
  type InterestType,
  type UpdateType,
} from '@/types/api';
import { useAssetMutations } from '@/api/hooks';

type Draft = {
  id: string;
  name: string;
  type: AssetType;
  amount: string;
  interest_rate: string;
  interest_type: InterestType;
  update_type: UpdateType;
  active: boolean;
  comment: string;
};

const empty: Draft = {
  id: '',
  name: '',
  type: 'BANK',
  amount: '0',
  interest_rate: '0',
  interest_type: 'NONE',
  update_type: 'MANUAL',
  active: true,
  comment: '',
};

function toDraft(a: Asset): Draft {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    amount: String(a.amount),
    interest_rate: String(a.interest_rate),
    interest_type: a.interest_type,
    update_type: a.update_type,
    active: a.active,
    comment: a.comment ?? '',
  };
}

export function AssetForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Asset | null;
}) {
  const { create, update } = useAssetMutations();
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDraft(editing ? toDraft(editing) : empty);
      setErrors({});
    }
  }, [open, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!editing && !draft.id.trim()) e.id = 'ID is required (e.g. A015)';
    if (draft.id.length > 32) e.id = 'Max 32 characters';
    if (!draft.name.trim()) e.name = 'Name is required';
    if (Number(draft.amount) < 0 || Number.isNaN(Number(draft.amount))) e.amount = 'Amount must be ≥ 0';
    if (Number(draft.interest_rate) < 0 || Number.isNaN(Number(draft.interest_rate)))
      e.interest_rate = 'Rate must be ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload: AssetInput = {
      id: draft.id.trim(),
      name: draft.name.trim(),
      type: draft.type,
      amount: Number(draft.amount),
      interest_rate: Number(draft.interest_rate),
      interest_type: draft.interest_type,
      update_type: draft.update_type,
      active: draft.active,
      comment: draft.comment.trim() || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch {
      /* toast handled in hook */
    }
  };

  const busy = create.isPending || update.isPending;
  const interestHint = useMemo(() => {
    if (draft.interest_type === 'MONTHLY') return 'Interest is paid out — pair with a recurring rule crediting a BANK asset.';
    if (draft.interest_type === 'CUMULATIVE') return 'Interest compounds inside this asset — recurring rule must have no target bank.';
    return 'No interest accrual tracked for this asset.';
  }, [draft.interest_type]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.id}` : 'New asset'}
      subtitle={editing ? editing.name : 'Add a holding to the tracker'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            {editing ? 'Save changes' : 'Create asset'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Asset ID" required error={errors.id} hint={editing ? 'ID cannot be changed' : 'Unique key, e.g. A015'}>
          <Input
            value={draft.id}
            disabled={!!editing}
            maxLength={32}
            placeholder="A015"
            onChange={(e) => set('id', e.target.value.toUpperCase())}
          />
        </Field>

        <Field label="Name" required error={errors.name}>
          <Input value={draft.name} placeholder="HDFC Savings" onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label="Type" required>
          <Select value={draft.type} onChange={(e) => set('type', e.target.value as AssetType)}>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Amount (₹)" required error={errors.amount}>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={draft.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>

        <Field label="Interest rate (annual %)" error={errors.interest_rate}>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={draft.interest_rate}
            onChange={(e) => set('interest_rate', e.target.value)}
          />
        </Field>

        <Field label="Interest type" hint={interestHint}>
          <Select value={draft.interest_type} onChange={(e) => set('interest_type', e.target.value as InterestType)}>
            {INTEREST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Update type" hint="RECURRING = value is driven by a recurring rule">
          <Select value={draft.update_type} onChange={(e) => set('update_type', e.target.value as UpdateType)}>
            {UPDATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <div className="field">
          <span className="field__label">Active</span>
          <div className="field__inline">
            <Toggle checked={draft.active} onChange={(v) => set('active', v)} label="Active" />
            <span className="field__msg">{draft.active ? 'Counted in totals & usable by rules' : 'Hidden from active totals'}</span>
          </div>
        </div>

        <Field label="Comment">
          <Textarea value={draft.comment} placeholder="Optional note" onChange={(e) => set('comment', e.target.value)} />
        </Field>

        <div className="form-preview">
          <AssetTypeIcon type={draft.type} size={18} />
          <span>
            {draft.id || 'A—'} · {draft.name || 'Unnamed'} · {draft.interest_type}
          </span>
        </div>
      </div>
    </Modal>
  );
}
