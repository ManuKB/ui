import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, Textarea, Toggle } from '@/components/ui/primitives';
import {
  INTEREST_MODES,
  REPEAT_TYPES,
  type Asset,
  type InterestMode,
  type RecurringInput,
  type RecurringRule,
  type RepeatType,
} from '@/types/api';
import { useRecurringMutations } from '@/api/hooks';
import { todayISO } from '@/lib/format';

type Draft = {
  id: string;
  asset_id: string;
  repeat_type: RepeatType;
  next_run: string;
  interest_mode: InterestMode;
  target_bank_id: string;
  auto_enabled: boolean;
  active: boolean;
  comment: string;
};

const emptyDraft = (): Draft => ({
  id: '',
  asset_id: '',
  repeat_type: 'MONTHLY',
  next_run: todayISO(),
  interest_mode: 'SIMPLE',
  target_bank_id: '',
  auto_enabled: false,
  active: true,
  comment: '',
});

export function RecurringForm({
  open,
  onClose,
  editing,
  assets,
}: {
  open: boolean;
  onClose: () => void;
  editing: RecurringRule | null;
  assets: Asset[];
}) {
  const { create, update } = useRecurringMutations();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(
      editing
        ? {
            id: editing.id,
            asset_id: editing.asset_id,
            repeat_type: editing.repeat_type,
            next_run: editing.next_run,
            interest_mode: editing.interest_mode,
            target_bank_id: editing.target_bank_id ?? '',
            auto_enabled: editing.auto_enabled,
            active: editing.active,
            comment: editing.comment ?? '',
          }
        : emptyDraft(),
    );
  }, [open, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const sourceAsset = assets.find((a) => a.id === draft.asset_id);
  const bankAssets = assets.filter((a) => a.type === 'BANK' && a.active);

  const targetRule: 'required' | 'forbidden' | 'optional' = useMemo(() => {
    if (sourceAsset?.interest_type === 'MONTHLY') return 'required';
    if (sourceAsset?.interest_type === 'CUMULATIVE') return 'forbidden';
    return 'optional';
  }, [sourceAsset]);

  // keep the target bank consistent with the rule
  useEffect(() => {
    if (targetRule === 'forbidden' && draft.target_bank_id) set('target_bank_id', '');
  }, [targetRule]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const e: Record<string, string> = {};
    if (!editing && !draft.id.trim()) e.id = 'Rule ID is required (e.g. R008)';
    if (draft.id.length > 32) e.id = 'Max 32 characters';
    if (!draft.asset_id) e.asset_id = 'Pick a source asset';
    if (!draft.next_run) e.next_run = 'Next run date is required';
    if (targetRule === 'required') {
      if (!draft.target_bank_id) e.target_bank_id = 'Required for a MONTHLY-interest source asset';
      else if (!bankAssets.some((b) => b.id === draft.target_bank_id))
        e.target_bank_id = 'Must be an active BANK asset';
    }
    if (targetRule === 'forbidden' && draft.target_bank_id)
      e.target_bank_id = 'CUMULATIVE source keeps its interest — leave empty';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload: RecurringInput = {
      id: draft.id.trim(),
      asset_id: draft.asset_id,
      repeat_type: draft.repeat_type,
      next_run: draft.next_run,
      interest_mode: draft.interest_mode,
      target_bank_id: targetRule === 'forbidden' ? null : draft.target_bank_id || null,
      auto_enabled: draft.auto_enabled,
      active: draft.active,
      comment: draft.comment.trim() || null,
    };
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
      title={editing ? `Edit ${editing.id}` : 'New recurring rule'}
      subtitle="Automates interest payouts, coupons and FD growth"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            {editing ? 'Save changes' : 'Create rule'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Rule ID" required error={errors.id} hint={editing ? 'ID cannot be changed' : 'Unique key, e.g. R008'}>
          <Input value={draft.id} disabled={!!editing} maxLength={32} placeholder="R008" onChange={(e) => set('id', e.target.value.toUpperCase())} />
        </Field>

        <Field label="Source asset" required error={errors.asset_id}>
          <Select value={draft.asset_id} onChange={(e) => set('asset_id', e.target.value)}>
            <option value="">Select…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} · {a.name} ({a.interest_type})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Repeats" required>
          <Select value={draft.repeat_type} onChange={(e) => set('repeat_type', e.target.value as RepeatType)}>
            {REPEAT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Next run" required error={errors.next_run}>
          <Input type="date" value={draft.next_run} onChange={(e) => set('next_run', e.target.value)} />
        </Field>

        <Field label="Interest mode" required hint="How the payout amount is computed by the firmware">
          <Select value={draft.interest_mode} onChange={(e) => set('interest_mode', e.target.value as InterestMode)}>
            {INTEREST_MODES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Target bank"
          error={errors.target_bank_id}
          hint={
            targetRule === 'required'
              ? 'Interest is credited here — must be an active BANK asset'
              : targetRule === 'forbidden'
                ? 'Disabled: CUMULATIVE source compounds in place'
                : 'Optional'
          }
        >
          <Select
            value={draft.target_bank_id}
            disabled={targetRule === 'forbidden'}
            onChange={(e) => set('target_bank_id', e.target.value)}
          >
            <option value="">{targetRule === 'required' ? 'Select a bank…' : 'None'}</option>
            {bankAssets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} · {b.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="field">
          <span className="field__label">Automatic processing</span>
          <div className="field__inline">
            <Toggle checked={draft.auto_enabled} onChange={(v) => set('auto_enabled', v)} label="Automatic processing" />
            <span className="field__msg">
              {draft.auto_enabled ? 'Firmware runs occurrences on schedule (status AUTO)' : 'Occurrences wait for a manual decision'}
            </span>
          </div>
        </div>

        <div className="field">
          <span className="field__label">Active</span>
          <div className="field__inline">
            <Toggle checked={draft.active} onChange={(v) => set('active', v)} label="Active" />
            <span className="field__msg">{draft.active ? 'Rule is live' : 'Rule is paused (status INACTIVE)'}</span>
          </div>
        </div>

        <Field label="Comment">
          <Textarea value={draft.comment} placeholder="Optional note" onChange={(e) => set('comment', e.target.value)} />
        </Field>

        {targetRule === 'required' && bankAssets.length === 0 && (
          <div className="inline-warn">
            <TriangleAlert size={16} />
            No active BANK asset exists yet — create one before saving this rule.
          </div>
        )}
      </div>
    </Modal>
  );
}
