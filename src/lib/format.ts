const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const fmtMoney = (n: number) => currency.format(n ?? 0);
export const fmtMoneyPrecise = (n: number) => currencyPrecise.format(n ?? 0);
export const fmtCompact = (n: number) => '₹' + compact.format(n ?? 0);
export const fmtPct = (n: number) => `${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
export const fmtNum = (n: number) => (n ?? 0).toLocaleString('en-IN');
export const fmtBytes = (b: number) => {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relativeDays(iso: string | null | undefined): string {
  if (!iso) return '';
  const target = new Date(iso + 'T00:00:00').getTime();
  const now = new Date(todayISO() + 'T00:00:00').getTime();
  const diff = Math.round((target - now) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export const initials = (s: string) =>
  s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
