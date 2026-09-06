import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Badge } from '@/components/ui/primitives';
import { AssetAvatar, ASSET_TYPE_META } from '@/components/domain';
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
              Edit
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
              <span className="asset-detail__amt mono">{fmtMoney(asset.amount)}</span>
              {asset.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>}
            </div>
          </div>

          <ul className="kv">
            <li><span>Type</span><b>{ASSET_TYPE_META[asset.type].label}</b></li>
            <li>
              <span>Interest</span>
              <b>{asset.interest_type === 'NONE' ? 'None' : `${asset.interest_type} · ${fmtPct(asset.interest_rate)}`}</b>
            </li>
            <li><span>Rate</span><b className="mono">{asset.interest_rate ? fmtPct(asset.interest_rate) : '—'}</b></li>
            <li><span>Updated by</span><b>{asset.update_type}</b></li>
            <li><span>Status</span><b>{asset.active ? 'Active' : 'Inactive'}</b></li>
          </ul>

          {asset.comment && <p className="asset-detail__note">{asset.comment}</p>}
        </div>
      )}
    </Modal>
  );
}
