import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 200,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  const segments = useMemo(() => {
    let offset = 0;
    return data
      .filter((d) => d.value > 0)
      .map((d) => {
        const frac = total > 0 ? d.value / total : 0;
        const seg = { ...d, frac, dash: frac * circ, offset };
        offset += frac * circ;
        return seg;
      });
  }, [data, total, circ]);

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${c} ${c})`}>
          {segments.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={-s.offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${circ}` }}
              animate={{ opacity: 1, strokeDasharray: `${s.dash} ${circ - s.dash}` }}
              transition={{ delay: 0.15 + i * 0.09, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </g>
      </svg>
      {(centerValue || centerLabel) && (
        <div className="donut__center">
          {centerValue && <strong>{centerValue}</strong>}
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
