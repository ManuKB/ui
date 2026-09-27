import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Badge, IconButton } from '@/components/ui/primitives';
import { AssetAvatar, ASSET_TYPE_META, InterestRateIcon } from '@/components/domain';
import { useAssetMutations } from '@/api/hooks';
import { fmtMoney, fmtPct } from '@/lib/format';
import type { Asset } from '@/types/api';

export function AssetDetail({
  asset,
  open,
  onClose,
  onEdit,
  onDelete,
  inUse,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  inUse: boolean;
}) {
  const { update } = useAssetMutations();
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // reset the quick-editor whenever a different asset opens (or the sheet closes)
  useEffect(() => {
    setEditingAmount(false);
    setAmountError(null);
  }, [asset?.id, open]);

  useEffect(() => {
    if (editingAmount) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingAmount]);

  const startEdit = () => {
    if (!asset) return;
    setAmountDraft(String(asset.amount));
    setAmountError(null);
    setEditingAmount(true);
  };

  const cancelEdit = () => {
    setEditingAmount(false);
    setAmountError(null);
  };

  const saveAmount = async () => {
    if (!asset) return;
    const value = Number(amountDraft);
    if (amountDraft.trim() === '' || Number.isNaN(value) || value < 0) {
      setAmountError('Enter an amount ≥ 0');
      return;
    }
    if (value === asset.amount) {
      setEditingAmount(false);
      return;
    }
    try {
      await update.mutateAsync({
        id: asset.id,
        input: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          amount: value,
          interest_rate: asset.interest_rate,
          interest_type: asset.interest_type,
          update_type: asset.update_type,
          active: asset.active,
          comment: asset.comment,
        },
      });
      setEditingAmount(false);
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title={asset?.name ?? ''}
      subtitle={asset ? `${asset.id} · ${ASSET_TYPE_META[asset.type].label}` : undefined}
      footer={
        asset && (
          <>
            <Button variant="ghost" icon={<Trash2 size={15} />} disabled={inUse} onClick={() => onDelete(asset)}>
              {inUse ? 'In use by a rule' : 'Delete'}
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => onEdit(asset)}>
              Edit details
            </Button>
          </>
        )
      }
    >
      {asset && (
        <div className="asset-detail">
          <div className="asset-detail__hero">
            <AssetAvatar type={asset.type} size={52} />
            <div>
              {editingAmount ? (
                <div className="asset-detail__amt-form">
                  <span className="asset-detail__amt-prefix">₹</span>
                  <input
                    ref={inputRef}
                    className="asset-detail__amt-input mono"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={amountDraft}
                    disabled={update.isPending}
                    onChange={(e) => {
                      setAmountDraft(e.target.value);
                      setAmountError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAmount();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <IconButton label="Cancel" onClick={cancelEdit} disabled={update.isPending}>
                    <X size={17} />
                  </IconButton>
                  <IconButton label="Save amount" className="asset-detail__amt-save" onClick={saveAmount} disabled={update.isPending}>
                    <Check size={17} />
                  </IconButton>
                </div>
              ) : (
                <button type="button" className="asset-detail__amt-edit" onClick={startEdit}>
                  <span className="asset-detail__amt mono">{fmtMoney(asset.amount)}</span>
                  <Pencil size={14} className="asset-detail__amt-pencil" />
                </button>
              )}
              {amountError && <span className="asset-detail__amt-error">{amountError}</span>}
              {!editingAmount && (asset.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>)}
            </div>
          </div>

          <ul className="kv">
            <li><span>Type</span><b>{ASSET_TYPE_META[asset.type].label}</b></li>
            <li>
              <span>Interest</span>
              <b>{asset.interest_type === 'NONE' ? 'None' : `${asset.interest_type} · ${fmtPct(asset.interest_rate)}`}</b>
            </li>
            <li>
              <span>Rate</span>
              <b className="mono rate-cell">
                <InterestRateIcon rate={asset.interest_rate} />
                {asset.interest_rate ? fmtPct(asset.interest_rate) : '—'}
              </b>
            </li>
            <li><span>Updated by</span><b>{asset.update_type}</b></li>
            <li><span>Status</span><b>{asset.active ? 'Active' : 'Inactive'}</b></li>
          </ul>

          {asset.comment && <p className="asset-detail__note">{asset.comment}</p>}
        </div>
      )}
    </Modal>
  );
}
