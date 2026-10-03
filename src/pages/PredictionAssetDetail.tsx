import { Calendar, Wallet, Flag, Clock, CheckCircle2, TriangleAlert, Pencil, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { AssetAvatar, ASSET_TYPE_META } from '@/components/domain';
import { fmtDate, fmtMoney } from '@/lib/format';
import type { AssetProjection } from '@/lib/prediction';
import type { Asset } from '@/types/api';

export function PredictionAssetDetail({
  asset,
  projection,
  targetDate,
  open,
  onClose,
  onSetSchedule,
}: {
  asset: Asset | null;
  projection: AssetProjection | null;
  targetDate: string;
  open: boolean;
  onClose: () => void;
  onSetSchedule: (a: Asset) => void;
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
          <Button variant="subtle" icon={<Pencil size={15} />} onClick={() => onSetSchedule(asset)}>
            {projection?.hasSchedule ? 'Edit schedule' : 'Set schedule'}
          </Button>
        )
      }
    >
      {asset && projection && (
        <div className="predict-detail">
          <div className="predict-detail__hero">
            <AssetAvatar type={asset.type} size={52} />
            <div>
              <span className="predict-detail__val mono">{fmtMoney(projection.predicted)}</span>
              <span className="dim">predicted on {fmtDate(targetDate)}</span>
            </div>
          </div>

          <ul className="kv">
            <li>
              <span>Current value</span>
              <b className="mono">{fmtMoney(projection.invested)}</b>
            </li>
            <li>
              <span>Interest / gain</span>
              <b className="mono" style={{ color: projection.gain >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {projection.gain >= 0 ? '+' : ''}
                {fmtMoney(projection.gain)}
              </b>
            </li>
          </ul>

          {asset.interest_type === 'NONE' || !(asset.interest_rate > 0) ? (
            <div className="inline-warn">
              <TriangleAlert size={16} />
              This asset has no interest rate, so its value stays flat.
            </div>
          ) : (
            <div className="predict-spec">
              <div className="predict-spec__row">
                <TrendingUp size={16} />
                <span>{asset.interest_type === 'CUMULATIVE' ? 'Cumulative · compounds monthly' : 'Monthly · interest paid out'}</span>
                <b>{asset.interest_rate}% p.a.</b>
              </div>
              <div className="predict-spec__row">
                <Calendar size={16} />
                <span>Selected date</span>
                <b>{fmtDate(targetDate)}</b>
              </div>
              {projection.matured && (
                <div className="predict-spec__row">
                  <Flag size={16} />
                  <span>Expiry date</span>
                  <b>{fmtDate(projection.expiryDate)}</b>
                </div>
              )}
              <div className="predict-spec__row">
                <Wallet size={16} />
                <span>Calculated value</span>
                <b>{fmtMoney(projection.predicted)}</b>
              </div>
              {projection.matured ? (
                <>
                  <div className="predict-spec__row predict-spec__row--ok">
                    <CheckCircle2 size={16} />
                    <span>Interest calculated until</span>
                    <b>{fmtDate(projection.interestUntil)}</b>
                  </div>
                  <div className="predict-spec__row predict-spec__row--warn">
                    <TriangleAlert size={16} />
                    <span>Asset matured</span>
                  </div>
                </>
              ) : (
                <div className="predict-spec__row predict-spec__row--info">
                  <Clock size={16} />
                  <span>Asset active</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
