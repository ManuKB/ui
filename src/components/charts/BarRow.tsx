import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fmtMoney } from '@/lib/format';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  sub?: string;
  /** with `onSelect`, a bar with nothing behind it stays non-interactive */
  disabled?: boolean;
}

export function BarList({ data, onSelect }: { data: BarDatum[]; onSelect?: (index: number) => void }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="barlist">
      {data.map((d, i) => {
        const clickable = !!onSelect && !d.disabled;
        const body = (
          <>
            <div className="barlist__meta">
              <span className="barlist__label">{d.label}</span>
              <span className="barlist__value mono">{fmtMoney(d.value)}</span>
            </div>
            <div className="barlist__track">
              <motion.div
                className="barlist__fill"
                style={{ background: d.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / max) * 100}%` }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {(d.sub || clickable) && (
              <span className="barlist__sub">
                {d.sub}
                {clickable && <ChevronRight size={13} className="barlist__go" />}
              </span>
            )}
          </>
        );
        return clickable ? (
          <button key={d.label} type="button" className="barlist__row barlist__row--btn" onClick={() => onSelect(i)}>
            {body}
          </button>
        ) : (
          <div className="barlist__row" key={d.label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
