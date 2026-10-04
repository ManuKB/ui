import type { Asset, RepeatType } from '@/types/api';
import { todayISO } from './format';
import { addMonthsISO } from './recurring';

export interface AssetSchedule {
  start_date: string | null;
  expiry_date: string | null;
}

export type ScheduleMap = Record<string, AssetSchedule>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Per-occurrence interest for a recurring rule (rate is ANNUAL; one occurrence
 * earns rate / periods-per-year, mirroring ESP32 CalculationService). Used by the
 * demo backend when it processes a rule — NOT by the Prediction page.
 */
export function occurrenceInterest(principal: number, annualRatePct: number, repeat: RepeatType): number {
  const periodsPerYear = { DAILY: 365, WEEKLY: 52, MONTHLY: 12, QUARTERLY: 4, YEARLY: 1 }[repeat] ?? 0;
  if (periodsPerYear <= 0) return 0;
  return round2((principal * (annualRatePct / 100)) / periodsPerYear);
}

/** CUMULATIVE interest compounds back into the asset this many times a year. */
export const CUMULATIVE_COMPOUNDS_PER_YEAR = 12;

export interface AssetProjection {
  assetId: string;
  invested: number;
  /** principal + interest earned by the target date (MONTHLY interest is paid out, but counted as gain) */
  predicted: number;
  gain: number;
  hasSchedule: boolean;
  matured: boolean;
  expiryDate: string | null;
  interestUntil: string | null;
}

export interface PortfolioProjection {
  today: string;
  targetDate: string;
  totals: { invested: number; predicted: number; gain: number; activeCount: number };
  perAsset: Map<string, AssetProjection>;
  timeline: { date: string; value: number }[];
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

const maxISO = (a: string, b: string) => (a >= b ? a : b);
const minISO = (a: string, b: string) => (a <= b ? a : b);

/**
 * Value of one asset on `date`, from its own interest_type and ANNUAL rate only:
 *   CUMULATIVE  interest is added back to the asset (compounds monthly)
 *   MONTHLY     interest is paid out every month on the unchanged principal (simple)
 *   NONE        no growth
 * Interest accrues from today (or the asset's start date if it is in the future)
 * until the target date, but never past the asset's expiry date.
 */
export function valueOnDate(asset: Asset, schedule: AssetSchedule | undefined, date: string, today: string): number {
  const rate = asset.interest_rate;
  if (asset.interest_type === 'NONE' || !(rate > 0)) return asset.amount;

  const from = schedule?.start_date ? maxISO(today, schedule.start_date) : today;
  const to = schedule?.expiry_date ? minISO(date, schedule.expiry_date) : date;
  const days = Math.max(0, dayNumber(to) - dayNumber(from));
  if (days === 0) return asset.amount;

  const years = days / 365;
  const r = rate / 100;
  if (asset.interest_type === 'CUMULATIVE') {
    const n = CUMULATIVE_COMPOUNDS_PER_YEAR;
    return asset.amount * Math.pow(1 + r / n, n * years);
  }
  return asset.amount * (1 + r * years); // MONTHLY
}

/** Asset types that never "mature", so they are left out of maturity reminders. */
const MATURITY_EXCLUDED_TYPES: Asset['type'][] = ['BANK', 'STOCK'];

export interface MaturityItem {
  asset: Asset;
  expiry: string;
  /** negative once the expiry date has passed */
  daysLeft: number;
  /** principal + interest up to the expiry date */
  maturityValue: number;
}

/**
 * Maturity reminders from asset data only (asset + its expiry date, no recurring rules):
 *   upcoming  expiry from today through today + `months` calendar months, soonest first
 *   matured   expiry already passed while the asset is still active, oldest first
 */
export function maturityAlerts(
  assets: Asset[],
  schedules: ScheduleMap,
  today: string = todayISO(),
  months = 3,
): { upcoming: MaturityItem[]; matured: MaturityItem[] } {
  const windowEnd = addMonthsISO(today, months);
  const upcoming: MaturityItem[] = [];
  const matured: MaturityItem[] = [];

  for (const asset of assets) {
    if (!asset.active) continue;
    if (MATURITY_EXCLUDED_TYPES.includes(asset.type)) continue;
    const schedule = schedules[asset.id];
    const expiry = schedule?.expiry_date;
    if (!expiry) continue;
    const item: MaturityItem = {
      asset,
      expiry,
      daysLeft: dayNumber(expiry) - dayNumber(today),
      maturityValue: round2(valueOnDate(asset, schedule, expiry, today)),
    };
    if (expiry < today) matured.push(item);
    else if (expiry <= windowEnd) upcoming.push(item);
  }

  upcoming.sort((a, b) => a.expiry.localeCompare(b.expiry));
  matured.sort((a, b) => a.expiry.localeCompare(b.expiry));
  return { upcoming, matured };
}

export interface MaturityBucketItem {
  asset: Asset;
  /** the asset's own end (expiry) date, null when it has none */
  expiry: string | null;
  /** predicted value on the selected date (what the bar sums) */
  value: number;
}

export interface MaturityBucket {
  key: string;
  label: string;
  /** end date of the bucket (31-Dec of its year); null for Matured / Long term */
  endsOn: string | null;
  kind: 'matured' | 'year' | 'long';
  value: number;
  count: number;
  items: MaturityBucketItem[];
}

/**
 * Groups active assets by maturity RELATIVE TO THE SELECTED DATE and sums their
 * predicted value on that date (matured assets are frozen at their expiry):
 *   Matured          expiry before the selected date
 *   Year buckets     the selected date's year and the 2 after it, each ending 31-Dec
 *   Long term        expiry after the third 31-Dec, or no expiry date at all
 */
export function maturityBuckets(
  assets: Asset[],
  schedules: ScheduleMap,
  perAsset: Map<string, AssetProjection>,
  targetDate: string,
  years = 3,
): MaturityBucket[] {
  const y0 = Number(targetDate.slice(0, 4));
  const buckets: MaturityBucket[] = [
    { key: 'matured', label: 'Matured', endsOn: null, kind: 'matured', value: 0, count: 0, items: [] },
    ...Array.from({ length: years }, (_, i) => ({
      key: `y${y0 + i}`,
      label: '',
      endsOn: `${y0 + i}-12-31`,
      kind: 'year' as const,
      value: 0,
      count: 0,
      items: [] as MaturityBucketItem[],
    })),
    { key: 'long', label: 'Long term', endsOn: null, kind: 'long', value: 0, count: 0, items: [] },
  ];

  for (const a of assets) {
    if (!a.active) continue;
    const predicted = perAsset.get(a.id)?.predicted ?? a.amount;
    const expiry = schedules[a.id]?.expiry_date ?? null;
    let bucket: MaturityBucket;
    if (!expiry) bucket = buckets[buckets.length - 1];
    else if (expiry < targetDate) bucket = buckets[0];
    else bucket = buckets.find((b) => b.kind === 'year' && expiry <= (b.endsOn as string)) ?? buckets[buckets.length - 1];
    bucket.value += predicted;
    bucket.count += 1;
    bucket.items.push({ asset: a, expiry, value: round2(predicted) });
  }
  for (const b of buckets) {
    b.value = round2(b.value);
    // soonest end date first, assets without one last; biggest value first on ties
    b.items.sort((x, y) => {
      if (x.expiry !== y.expiry) return x.expiry === null ? 1 : y.expiry === null ? -1 : x.expiry.localeCompare(y.expiry);
      return y.value - x.value;
    });
  }
  return buckets;
}

function buildSampleDates(start: string, end: string, count: number): string[] {
  const s = new Date(start + 'T00:00:00Z').getTime();
  const e = new Date(end + 'T00:00:00Z').getTime();
  if (e <= s) return [start];
  const dates: string[] = [];
  for (let i = 0; i <= count; i++) {
    dates.push(new Date(s + ((e - s) * i) / count).toISOString().slice(0, 10));
  }
  return dates;
}

/** Projects every active asset to `targetDate` (see `valueOnDate`). Independent of recurring rules. */
export function projectPortfolio(
  assets: Asset[],
  schedules: ScheduleMap,
  targetDate: string,
  sampleCount = 10,
): PortfolioProjection {
  const today = todayISO();
  const activeAssets = assets.filter((a) => a.active);

  const timeline = buildSampleDates(today, targetDate, sampleCount).map((date) => ({
    date,
    value: round2(activeAssets.reduce((sum, a) => sum + valueOnDate(a, schedules[a.id], date, today), 0)),
  }));

  const perAsset = new Map<string, AssetProjection>();
  let totalInvested = 0;
  let totalPredicted = 0;
  for (const a of activeAssets) {
    const schedule = schedules[a.id];
    const predicted = round2(valueOnDate(a, schedule, targetDate, today));
    const expiry = schedule?.expiry_date ?? null;
    const matured = !!expiry && expiry < targetDate;
    perAsset.set(a.id, {
      assetId: a.id,
      invested: a.amount,
      predicted,
      gain: round2(predicted - a.amount),
      hasSchedule: !!(schedule?.start_date || schedule?.expiry_date),
      matured,
      expiryDate: expiry,
      interestUntil: matured ? expiry : null,
    });
    totalInvested += a.amount;
    totalPredicted += predicted;
  }

  return {
    today,
    targetDate,
    totals: {
      invested: round2(totalInvested),
      predicted: round2(totalPredicted),
      gain: round2(totalPredicted - totalInvested),
      activeCount: activeAssets.length,
    },
    perAsset,
    timeline,
  };
}
