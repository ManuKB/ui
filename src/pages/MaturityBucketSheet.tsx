import { CalendarX2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/primitives';
import { AssetAvatar, ASSET_TYPE_META } from '@/components/domain';
import { fmtDate, fmtMoney } from '@/lib/format';
import type { MaturityBucket } from '@/lib/prediction';

/** Popup for a maturity-timeline bar: bottom sheet on phones, centred dialog on desktop. */
export function MaturityBucketSheet({
  bucket,
  title,
  targetDate,
  onClose,
}: {
  bucket: MaturityBucket | null;
  title: string;
  targetDate: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!bucket}
      onClose={onClose}
      variant="sheet"
      title={title}
      subtitle={
        bucket ? `${bucket.count} asset${bucket.count === 1 ? '' : 's'} · ${fmtMoney(bucket.value)} on ${fmtDate(targetDate)}` : undefined
      }
    >
      {bucket && bucket.items.length === 0 ? (
        <EmptyState icon={<CalendarX2 size={26} />} title="No assets" hint="Nothing falls in this bucket for the selected date." />
      ) : (
        <div className="bucket-sheet">
          {bucket?.items.map(({ asset, expiry, value }) => (
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
