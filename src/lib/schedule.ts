import type { MemoryEntry } from '@/types/api';
import type { AssetSchedule, ScheduleMap } from './prediction';

export const SCHEDULE_ENTITY = 'asset';
export const START_FIELD = 'start_date';
export const EXPIRY_FIELD = 'expiry_date';

/** Deterministic Memory row ids so a schedule field can be upserted without a lookup first. */
export const scheduleMemoryId = (assetId: string, field: typeof START_FIELD | typeof EXPIRY_FIELD) =>
  `sched-${assetId}-${field}`;

/** Folds the flat Memory rows tagged entity="asset" into a per-asset start/expiry map. */
export function toScheduleMap(rows: MemoryEntry[]): ScheduleMap {
  const map: ScheduleMap = {};
  for (const row of rows) {
    if (row.entity !== SCHEDULE_ENTITY) continue;
    if (row.name !== START_FIELD && row.name !== EXPIRY_FIELD) continue;
    const entry = (map[row.owner] ??= { start_date: null, expiry_date: null });
    if (row.name === START_FIELD) entry.start_date = row.key || null;
    else entry.expiry_date = row.key || null;
  }
  return map;
}

export const emptySchedule: AssetSchedule = { start_date: null, expiry_date: null };
