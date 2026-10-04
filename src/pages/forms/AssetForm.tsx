import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
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
import { useAssetMutations, useAssets, useAssetSchedules, useSetAssetSchedule } from '@/api/hooks';

/** Suggested ID for a new asset: "A" + (asset count + 1), skipping any ID already taken. */
function nextAssetId(assets: Asset[] | undefined): string {
  const taken = new Set((assets ?? []).map((a) => a.id));
  let n = (assets?.length ?? 0) + 1;
  while (taken.has(`A${String(n).padStart(3, '0')}`)) n += 1;
  return `A${String(n).padStart(3, '0')}`;
}

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
  start_date: string;
  expiry_date: string;
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
  start_date: '',
  expiry_date: '',
};

function toDraft(a: Asset, start_date: string, expiry_date: string): Draft {
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
    start_date,
    expiry_date,
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
  const { data: schedules } = useAssetSchedules();
  const { data: assets } = useAssets();
  const setSchedule = useSetAssetSchedule();
  const [draft, setDraft] = useState<Draft>(empty);
  const [initialSchedule, setInitialSchedule] = useState({ start_date: '', expiry_date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      const sched = schedules?.[editing.id];
      const start = sched?.start_date ?? '';
      const expiry = sched?.expiry_date ?? '';
      setDraft(toDraft(editing, start, expiry));
      setInitialSchedule({ start_date: start, expiry_date: expiry });
    } else {
      setDraft({ ...empty, id: nextAssetId(assets) });
      setInitialSchedule({ start_date: '', expiry_date: '' });
    }
    // `assets` is read when the form opens but deliberately not a dependency, so a
    // background refetch can't overwrite what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, schedules]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!editing && !draft.id.trim()) e.id = 'ID is required (e.g. A015)';
    if (draft.id.length > 32) e.id = 'Max 32 characters';
    if (!draft.name.trim()) e.name = 'Name is required';
    if (Number(draft.amount) < 0 || Number.isNaN(Number(draft.amount))) e.amount = 'Amount must be ≥ 0';
    if (Number(draft.interest_rate) < 0 || Number.isNaN(Number(draft.interest_rate)))
      e.interest_rate = 'Rate must be ≥ 0';
    if (draft.start_date && draft.expiry_date && draft.expiry_date < draft.start_date)
      e.expiry_date = 'Expiry must be on or after the start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const id = editing ? editing.id : draft.id.trim();
    const payload: AssetInput = {
      id,
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
      if (editing) await update.mutateAsync({ id, input: payload });
      else await create.mutateAsync(payload);

      const scheduleChanged =
        draft.start_date !== initialSchedule.start_date || draft.expiry_date !== initialSchedule.expiry_date;
      if (scheduleChanged) {
        await setSchedule.mutateAsync({
          assetId: id,
          schedule: { start_date: draft.start_date || null, expiry_date: draft.expiry_date || null },
        });
      }
      onClose();
    } catch {
      /* toast handled in hook */
    }
  };

  const busy = create.isPending || update.isPending || setSchedule.isPending;
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
        <Field label="Asset ID" required error={errors.id} hint={editing ? 'ID cannot be changed' : 'Suggested next ID — you can change it'}>
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

        <div className="form-section">
          <CalendarClock size={15} />
          <span>Prediction schedule</span>
        </div>

        <Field label="Start date" hint="When this asset started earning — used to project future value">
          <Input type="date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </Field>

        <Field label="Expiry date" error={errors.expiry_date} hint="Maturity date, if any — growth stops here in predictions. Leave blank if it never matures.">
          <Input type="date" value={draft.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
        </Field>

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
