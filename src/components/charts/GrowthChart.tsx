import { motion } from 'framer-motion';
import { fmtDate } from '@/lib/format';

export interface GrowthPoint {
  date: string;
  value: number;
}

export function GrowthChart({ data, height = 200 }: { data: GrowthPoint[]; height?: number }) {
  const width = 600;
  const padY = 16;

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = padY + (height - padY * 2) * (1 - (d.value - min) / span);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const areaPath = `${linePath} L${last[0].toFixed(1)},${height} L0,${height} Z`;

  return (
    <div className="growth-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="growth-chart__svg">
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-emerald)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={areaPath} fill="url(#growthFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--accent-emerald)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {last && <circle cx={last[0]} cy={last[1]} r={4.5} fill="var(--accent-emerald)" stroke="var(--surface-solid)" strokeWidth={2} />}
      </svg>
      <div className="growth-chart__labels">
        <span>{fmtDate(data[0].date)}</span>
        <span>{fmtDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
