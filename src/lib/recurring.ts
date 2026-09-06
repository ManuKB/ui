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

export function advanceDate(iso: string, repeat: RepeatType): string {
  const d = new Date(iso + 'T00:00:00');
  switch (repeat) {
    case 'DAILY': d.setDate(d.getDate() + 1); break;
    case 'WEEKLY': d.setDate(d.getDate() + 7); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break;
    case 'YEARLY': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
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
