import type { RecurringRule, RecurringStatus, RepeatType } from '@/types/api';
import { todayISO } from './format';

/**
 * Derive `status` exactly as documented in openapi.yaml:
 *   SCHEDULED  next_run > today
 *   DUE        next_run == today && !auto
 *   OVERDUE    next_run < today && !auto
 *   AUTO       next_run <= today && auto
 *   INACTIVE   active == false
 */
export function deriveStatus(
  rule: Pick<RecurringRule, 'next_run' | 'auto_enabled' | 'active'>,
  today = todayISO(),
): RecurringStatus {
  if (!rule.active) return 'INACTIVE';
  const cmp = rule.next_run.localeCompare(today);
  if (cmp > 0) return 'SCHEDULED';
  if (rule.auto_enabled) return 'AUTO';
  return cmp === 0 ? 'DUE' : 'OVERDUE';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Pure-UTC calendar math (timezone independent) mirroring the firmware's
 * DateUtil::nextRun, incl. month-end clamping (Jan 31 + 1 month = Feb 28/29).
 * Mixing local-time parsing with toISOString() made dates stand still in
 * timezones ahead of UTC (e.g. IST).
 */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const daysInMonth = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad2(nm + 1)}-${pad2(Math.min(d, daysInMonth))}`;
}

export function advanceDate(iso: string, repeat: RepeatType): string {
  switch (repeat) {
    case 'DAILY': return addDaysISO(iso, 1);
    case 'WEEKLY': return addDaysISO(iso, 7);
    case 'MONTHLY': return addMonthsISO(iso, 1);
    case 'QUARTERLY': return addMonthsISO(iso, 3);
    case 'YEARLY': return addMonthsISO(iso, 12);
  }
}

export const STATUS_META: Record<RecurringStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  DUE: { label: 'Due today', tone: 'warn' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  AUTO: { label: 'Automatic', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'muted' },
};

export const isPending = (r: RecurringRule) =>
  r.active && !r.auto_enabled && r.next_run.localeCompare(todayISO()) <= 0;
