import { CalendarX2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/primitives';
import { AssetAvatar, ASSET_TYPE_META } from '@/components/domain';
import { fmtDate, fmtMoney } from '@/lib/format';
import type { MaturityBucketItem } from '@/lib/prediction';

/**
 * Popup listing assets with their value and end date: a bottom sheet on phones
 * (the list scrolls inside it) and a centred dialog on desktop.
 */
export function AssetListSheet({
  open,
  title,
  subtitle,
  items,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  items: MaturityBucketItem[];
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <EmptyState icon={<CalendarX2 size={26} />} title="No assets" hint="Nothing falls in this group." />
      ) : (
        <div className="bucket-sheet">
          {items.map(({ asset, expiry, value }) => (
            <div className="bucket-item" key={asset.id}>
              <AssetAvatar type={asset.type} size={38} />
              <div className="bucket-item__mid">
                <span className="bucket-item__name">{asset.name}</span>
                <span className="bucket-item__meta">
                  <span className="mono">{asset.id}</span> · {ASSET_TYPE_META[asset.type].label}
                </span>
              </div>
              <div className="bucket-item__right">
                <span className="bucket-item__value mono">{fmtMoney(value)}</span>
                <span className={`bucket-item__end ${expiry ? '' : 'bucket-item__end--none'}`}>
                  {expiry ? `Ends ${fmtDate(expiry)}` : 'No end date'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
