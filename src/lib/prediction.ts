import type { Asset, RepeatType } from '@/types/api';
import { todayISO } from './format';

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
