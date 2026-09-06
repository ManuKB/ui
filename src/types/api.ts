// Types mirror components/schemas in openapi.yaml (ESP32 Savings Tracker API v1.0.0)

export type AssetType = 'BANK' | 'FD' | 'STOCK' | 'BOND' | 'LENDING' | 'CASH';
export type InterestType = 'NONE' | 'MONTHLY' | 'CUMULATIVE';
export type UpdateType = 'MANUAL' | 'RECURRING';

export type RepeatType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type InterestMode = 'SIMPLE' | 'COMPOUND' | 'NONE';
export type RecurringStatus = 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'AUTO' | 'INACTIVE';

export const ASSET_TYPES: AssetType[] = ['BANK', 'FD', 'STOCK', 'BOND', 'LENDING', 'CASH'];
export const INTEREST_TYPES: InterestType[] = ['NONE', 'MONTHLY', 'CUMULATIVE'];
export const UPDATE_TYPES: UpdateType[] = ['MANUAL', 'RECURRING'];
export const REPEAT_TYPES: RepeatType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
export const INTEREST_MODES: InterestMode[] = ['SIMPLE', 'COMPOUND', 'NONE'];

export const MAX_ASSETS = 100;
export const MAX_RECURRING = 100;

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  amount: number;
  interest_rate: number;
  interest_type: InterestType;
  update_type: UpdateType;
  active: boolean;
  comment: string | null;
}

export type AssetInput = Asset;

export interface RecurringRule {
  id: string;
  asset_id: string;
  asset_name?: string; // only present in /pending responses
  repeat_type: RepeatType;
  next_run: string; // YYYY-MM-DD
  interest_mode: InterestMode;
  target_bank_id: string | null;
  auto_enabled: boolean;
  last_run: string | null;
  active: boolean;
  comment: string | null;
  status: RecurringStatus;
}

export interface RecurringInput {
  id: string;
  asset_id: string;
  repeat_type: RepeatType;
  next_run: string;
  interest_mode: InterestMode;
  target_bank_id: string | null;
  auto_enabled: boolean;
  active: boolean;
  comment: string | null;
}

export interface SystemStatus {
  device: string;
  wifi_connected: boolean;
  ip: string;
  rssi: number;
  hostname: string;
  time_synced: boolean;
  date: string;
  datetime: string;
  database: 'ok' | 'error';
  free_heap: number;
}

export interface ProcessResult {
  id: string;
  processed_occurrences: number;
  bank_credited: number;
  source_delta: number;
  target_bank_id: string | null;
  last_run: string;
  next_run: string;
}

export interface SkipResult {
  id: string;
  skipped: boolean;
  next_run: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, body: ApiErrorBody | string) {
    const parsed = typeof body === 'string' ? { error: 'ERROR', message: body } : body;
    super(parsed.message || parsed.error || `HTTP ${status}`);
    this.name = 'ApiError';
    this.code = parsed.error || 'ERROR';
    this.status = status;
  }
}
