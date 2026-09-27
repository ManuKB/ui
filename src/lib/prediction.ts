import type { Asset, RecurringRule, RepeatType } from '@/types/api';
import { advanceDate } from './recurring';
import { todayISO } from './format';

export interface AssetSchedule {
  start_date: string | null;
  expiry_date: string | null;
}

export type ScheduleMap = Record<string, AssetSchedule>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Interest earned on one occurrence of a recurring rule. Identical formula to the
 * one the firmware/mock applies when it actually processes an occurrence (see
 * api/mock.ts `processRecurring`) — the projection below walks the same mechanics
 * forward in time instead of inventing a separate growth model.
 */
export function occurrenceInterest(principal: number, annualRatePct: number, repeat: RepeatType): number {
  const fractionOfYear =
    repeat === 'DAILY' ? 1 / 365 : repeat === 'WEEKLY' ? 7 / 365 : repeat === 'MONTHLY' ? 1 / 12 : repeat === 'QUARTERLY' ? 1 / 4 : 1;
  return round2(principal * (annualRatePct / 100) * fractionOfYear);
}

export interface AssetProjection {
  assetId: string;
  invested: number;
  predicted: number;
  gain: number;
  hasRule: boolean;
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

// Safety cap so a pathological DAILY rule decades out can't hang the tab (~50yrs of daily occurrences).
const MAX_STEPS_PER_RULE = 20_000;

interface InterestEvent {
  date: string;
  assetId: string;
  delta: number;
}

function buildSampleDates(start: string, end: string, count: number): string[] {
  const s = new Date(start + 'T00:00:00').getTime();
  const e = new Date(end + 'T00:00:00').getTime();
  if (e <= s) return [start];
  const dates: string[] = [];
  for (let i = 0; i <= count; i++) {
    dates.push(new Date(s + ((e - s) * i) / count).toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Projects every active asset forward to `targetDate` by walking each active
 * recurring rule occurrence-by-occurrence (respecting repeat_type and whether
 * interest compounds in place vs. pays out to a target bank), capped at the
 * source asset's own expiry_date when one is set. Assets with no rule, or past
 * their expiry, simply stop growing — matching how the firmware would actually
 * behave if every due occurrence were processed on schedule.
 */
export function projectPortfolio(
  assets: Asset[],
  rules: RecurringRule[],
  schedules: ScheduleMap,
  targetDate: string,
  sampleCount = 10,
): PortfolioProjection {
  const today = todayISO();
  const activeAssets = assets.filter((a) => a.active);
  const invested = new Map(activeAssets.map((a) => [a.id, a.amount]));
  const simPrincipal = new Map(invested); // grows in place as CUMULATIVE occurrences are simulated
  const rulesByAssetId = new Map<string, boolean>();
  const events: InterestEvent[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const source = assets.find((a) => a.id === rule.asset_id);
    if (!source || !source.active) continue;
    rulesByAssetId.set(source.id, true);

    const expiry = schedules[source.id]?.expiry_date ?? null;
    const cap = expiry && expiry < targetDate ? expiry : targetDate;

    let next = rule.next_run;
    let steps = 0;
    while (next.localeCompare(cap) <= 0 && steps < MAX_STEPS_PER_RULE) {
      const principal = simPrincipal.get(source.id) ?? source.amount;
      const interest = occurrenceInterest(principal, source.interest_rate, rule.repeat_type);
      if (interest !== 0) {
        if (source.interest_type === 'CUMULATIVE') {
          events.push({ date: next, assetId: source.id, delta: interest });
          simPrincipal.set(source.id, principal + interest);
        } else if (rule.target_bank_id) {
          events.push({ date: next, assetId: rule.target_bank_id, delta: interest });
        }
      }
      next = advanceDate(next, rule.repeat_type);
      steps += 1;
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  const sampleDates = buildSampleDates(today, targetDate, sampleCount);
  const timeline: { date: string; value: number }[] = [];
  const running = new Map(invested);
  let ei = 0;
  for (const sampleDate of sampleDates) {
    while (ei < events.length && events[ei].date.localeCompare(sampleDate) <= 0) {
      const ev = events[ei];
      if (running.has(ev.assetId)) running.set(ev.assetId, (running.get(ev.assetId) ?? 0) + ev.delta);
      ei += 1;
    }
    let sum = 0;
    for (const v of running.values()) sum += v;
    timeline.push({ date: sampleDate, value: round2(sum) });
  }
  while (ei < events.length) {
    const ev = events[ei];
    if (running.has(ev.assetId)) running.set(ev.assetId, (running.get(ev.assetId) ?? 0) + ev.delta);
    ei += 1;
  }

  const perAsset = new Map<string, AssetProjection>();
  let totalInvested = 0;
  let totalPredicted = 0;
  for (const a of activeAssets) {
    const inv = invested.get(a.id) ?? 0;
    const pred = round2(running.get(a.id) ?? inv);
    const expiry = schedules[a.id]?.expiry_date ?? null;
    const matured = !!expiry && expiry < targetDate;
    perAsset.set(a.id, {
      assetId: a.id,
      invested: inv,
      predicted: pred,
      gain: round2(pred - inv),
      hasRule: rulesByAssetId.has(a.id),
      hasSchedule: !!schedules[a.id]?.start_date,
      matured,
      expiryDate: expiry,
      interestUntil: matured ? expiry : null,
    });
    totalInvested += inv;
    totalPredicted += pred;
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
