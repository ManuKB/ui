import { fmtDate, fmtMoney } from '@/lib/format';
import type { MaturityBucket } from '@/lib/prediction';
import { AssetListSheet } from './AssetListSheet';

/** Popup for a maturity-timeline bar (Prediction page). */
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
    <AssetListSheet
      open={!!bucket}
      onClose={onClose}
      title={title}
      subtitle={
        bucket ? `${bucket.count} asset${bucket.count === 1 ? '' : 's'} · ${fmtMoney(bucket.value)} on ${fmtDate(targetDate)}` : undefined
      }
      items={bucket?.items ?? []}
    />
  );
}
