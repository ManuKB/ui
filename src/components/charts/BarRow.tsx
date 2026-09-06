import { motion } from 'framer-motion';
import { fmtMoney } from '@/lib/format';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  sub?: string;
}

export function BarList({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="barlist">
      {data.map((d, i) => (
        <div className="barlist__row" key={d.label}>
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
          {d.sub && <span className="barlist__sub">{d.sub}</span>}
        </div>
      ))}
    </div>
  );
}
