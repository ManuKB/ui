import {
  ApiError,
  MAX_ASSETS,
  MAX_MEMORY,
  MAX_RECURRING,
  type Asset,
  type AssetInput,
  type MemoryEntry,
  type MemoryFilters,
  type MemoryInput,
  type ProcessResult,
  type RecurringInput,
  type RecurringRule,
  type SkipResult,
  type SystemStatus,
} from '@/types/api';
import { advanceDate, deriveStatus, isPending } from '@/lib/recurring';
import { todayISO } from '@/lib/format';

const LS_KEY = 'savings-tracker:mock-db:v1';

interface DB {
  assets: Asset[];
  recurring: Omit<RecurringRule, 'status' | 'asset_name'>[];
  memory: MemoryEntry[];
}

let memSeq = 100;
const genMemId = () => `mem_${Date.now().toString(36)}_${++memSeq}`;

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed(): DB {
  const assets: Asset[] = [
    { id: 'A001', name: 'HDFC Savings', type: 'BANK', amount: 512.5, interest_rate: 3.0, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: 'Primary salary account' },
    { id: 'A002', name: 'ICICI Savings', type: 'BANK', amount: 184.3, interest_rate: 3.5, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: null },
    { id: 'A003', name: 'HDFC FD 7%', type: 'FD', amount: 1000, interest_rate: 7.0, interest_type: 'MONTHLY', update_type: 'RECURRING', active: true, comment: 'Monthly payout to HDFC Savings' },
    { id: 'A004', name: 'SBI Tax Saver FD', type: 'FD', amount: 150, interest_rate: 6.75, interest_type: 'CUMULATIVE', update_type: 'RECURRING', active: true, comment: '5-year lock-in' },
    { id: 'A005', name: 'Axis Cumulative FD', type: 'FD', amount: 420, interest_rate: 7.25, interest_type: 'CUMULATIVE', update_type: 'RECURRING', active: true, comment: null },
    { id: 'A006', name: 'Nifty 50 Index Fund', type: 'STOCK', amount: 875.6, interest_rate: 0, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: 'SIP since 2021' },
    { id: 'A007', name: 'Reliance Shares', type: 'STOCK', amount: 246.8, interest_rate: 0, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: null },
    { id: 'A008', name: 'RBI Floating Rate Bond', type: 'BOND', amount: 300, interest_rate: 8.05, interest_type: 'MONTHLY', update_type: 'RECURRING', active: true, comment: 'Half-yearly coupon' },
    { id: 'A009', name: 'NHAI Tax-Free Bond', type: 'BOND', amount: 200, interest_rate: 5.75, interest_type: 'MONTHLY', update_type: 'RECURRING', active: true, comment: null },
    { id: 'A010', name: 'Loan to Ravi', type: 'LENDING', amount: 75, interest_rate: 12.0, interest_type: 'MONTHLY', update_type: 'RECURRING', active: true, comment: 'Repayment by Mar 2027' },
    { id: 'A011', name: 'Cash on hand', type: 'CASH', amount: 18.5, interest_rate: 0, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: null },
    { id: 'A012', name: 'Emergency Cash', type: 'CASH', amount: 50, interest_rate: 0, interest_type: 'NONE', update_type: 'MANUAL', active: true, comment: 'Home safe' },
    { id: 'A013', name: 'Old Kotak FD (matured)', type: 'FD', amount: 0, interest_rate: 6.5, interest_type: 'NONE', update_type: 'MANUAL', active: false, comment: 'Closed Jan 2026' },
    { id: 'A014', name: 'Gold Sovereign Bond', type: 'BOND', amount: 260, interest_rate: 2.5, interest_type: 'MONTHLY', update_type: 'RECURRING', active: true, comment: 'SGB 2023-24 Series' },
  ];

  const recurring: DB['recurring'] = [
    { id: 'R001', asset_id: 'A003', repeat_type: 'MONTHLY', next_run: daysFromNow(9), interest_mode: 'SIMPLE', target_bank_id: 'A001', auto_enabled: false, last_run: daysFromNow(-21), active: true, comment: 'HDFC FD monthly interest' },
    { id: 'R002', asset_id: 'A005', repeat_type: 'MONTHLY', next_run: daysFromNow(3), interest_mode: 'COMPOUND', target_bank_id: null, auto_enabled: true, last_run: daysFromNow(-27), active: true, comment: 'Axis FD compounding' },
    { id: 'R003', asset_id: 'A008', repeat_type: 'QUARTERLY', next_run: daysFromNow(0), interest_mode: 'SIMPLE', target_bank_id: 'A002', auto_enabled: false, last_run: daysFromNow(-90), active: true, comment: 'RBI bond coupon' },
    { id: 'R004', asset_id: 'A010', repeat_type: 'MONTHLY', next_run: daysFromNow(-6), interest_mode: 'SIMPLE', target_bank_id: 'A001', auto_enabled: false, last_run: daysFromNow(-36), active: true, comment: 'Ravi loan EMI interest' },
    { id: 'R005', asset_id: 'A004', repeat_type: 'YEARLY', next_run: daysFromNow(120), interest_mode: 'COMPOUND', target_bank_id: null, auto_enabled: false, last_run: null, active: true, comment: 'SBI tax saver annual' },
    { id: 'R006', asset_id: 'A014', repeat_type: 'MONTHLY', next_run: daysFromNow(-2), interest_mode: 'SIMPLE', target_bank_id: 'A002', auto_enabled: true, last_run: daysFromNow(-32), active: true, comment: 'SGB interest' },
    { id: 'R007', asset_id: 'A009', repeat_type: 'MONTHLY', next_run: daysFromNow(15), interest_mode: 'SIMPLE', target_bank_id: 'A001', auto_enabled: false, last_run: null, active: false, comment: 'Paused — NHAI bond' },
  ];

  const memory: MemoryEntry[] = [
    { id: 'mem_seed_1', entity: 'asset', owner: 'A003', name: 'nickname', key: 'Rainy-day FD' },
    { id: 'mem_seed_2', entity: 'asset', owner: 'A001', name: 'account_no', key: '5010 0234 9981 2210' },
    { id: 'mem_seed_3', entity: 'asset', owner: 'A001', name: 'net_banking_pin', key: '48213' },
    { id: 'mem_seed_4', entity: 'asset', owner: 'A006', name: 'broker_login', key: 'ZERO-4471-KX' },
    { id: 'mem_seed_5', entity: 'recurring', owner: 'R001', name: 'note', key: 'confirm with branch before 5th' },
    { id: 'mem_seed_6', entity: 'device', owner: 'savings-esp32', name: 'wifi_psk', key: 'hunter2-Galaxy-5G' },
    { id: 'mem_seed_7', entity: 'device', owner: 'savings-esp32', name: 'api_token', key: 'sk_live_9f2b71c4e8a04d6fbb31' },
    { id: 'mem_seed_8', entity: 'user', owner: 'mohan', name: 'upi_pin', key: '901733' },
    { id: 'mem_seed_9', entity: 'asset', owner: 'A010', name: 'borrower_phone', key: '+91 98840 55127' },
    { id: 'mem_seed_10', entity: 'asset', owner: 'A008', name: 'demat_id', key: 'IN30 0214 1099 7742' },
  ];

  return { assets, recurring, memory };
}

function load(): DB {
  const fresh = seed();
  try {
    const raw = localStorage.getItem(LS_KEY);
    // Merge so databases saved before a field was added still get seeded defaults.
    if (raw) return { ...fresh, ...(JSON.parse(raw) as Partial<DB>) };
  } catch {
    /* ignore */
  }
  save(fresh);
  return fresh;
}

function save(db: DB) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export function resetMockDb() {
  const fresh = seed();
  save(fresh);
}

let db = load();
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms + Math.random() * 180));

function withStatus(r: DB['recurring'][number], withName = false): RecurringRule {
  const rule: RecurringRule = { ...r, status: deriveStatus(r) };
  if (withName) rule.asset_name = db.assets.find((a) => a.id === r.asset_id)?.name;
  return rule;
}

function coerceAsset(input: AssetInput, id: string): Asset {
  return {
    id,
    name: String(input.name ?? '').trim(),
    type: input.type,
    amount: Number(input.amount ?? 0),
    interest_rate: Number(input.interest_rate ?? 0),
    interest_type: input.interest_type ?? 'NONE',
    update_type: input.update_type ?? 'MANUAL',
    active: input.active ?? true,
    comment: input.comment?.toString().trim() || null,
  };
}

function validateAsset(a: Asset) {
  if (!a.name) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'name is required' });
  if (!a.type) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'type is required' });
  if (!(a.amount >= 0)) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'amount must be >= 0' });
  if (!(a.interest_rate >= 0)) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'interest_rate must be >= 0' });
}

function validateRecurring(input: RecurringInput) {
  const src = db.assets.find((a) => a.id === input.asset_id);
  if (!src) throw new ApiError(400, { error: 'ASSET_NOT_FOUND', message: `asset_id ${input.asset_id} does not exist` });
  if (!input.repeat_type) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'repeat_type is required' });
  if (!input.next_run) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'next_run is required' });

  if (src.interest_type === 'MONTHLY') {
    if (!input.target_bank_id)
      throw new ApiError(400, { error: 'TARGET_BANK_REQUIRED', message: 'target_bank_id is required for a MONTHLY-interest source asset' });
    const bank = db.assets.find((a) => a.id === input.target_bank_id);
    if (!bank) throw new ApiError(400, { error: 'ASSET_NOT_FOUND', message: `target_bank_id ${input.target_bank_id} does not exist` });
    if (bank.type !== 'BANK')
      throw new ApiError(400, { error: 'TARGET_BANK_INVALID_TYPE', message: `target_bank_id ${bank.id} is not a BANK asset` });
  }
  if (src.interest_type === 'CUMULATIVE' && input.target_bank_id) {
    throw new ApiError(400, {
      error: 'TARGET_BANK_NOT_ALLOWED',
      message: 'a CUMULATIVE asset keeps its interest - target_bank_id must be empty',
    });
  }
}

/** Simplified monthly-equivalent interest for a single occurrence. */
function occurrenceInterest(principal: number, annualRate: number, repeat: RecurringInput['repeat_type']): number {
  const fractionOfYear =
    repeat === 'DAILY' ? 1 / 365 : repeat === 'WEEKLY' ? 7 / 365 : repeat === 'MONTHLY' ? 1 / 12 : repeat === 'QUARTERLY' ? 1 / 4 : 1;
  return Math.round(principal * (annualRate / 100) * fractionOfYear * 100) / 100;
}

export const mockApi = {
  async getSystemStatus(): Promise<SystemStatus> {
    await delay(180);
    const heapFree = 176_000 + Math.round(Math.random() * 6000);
    return {
      device: 'ESP32 Savings Tracker',
      wifi_connected: true,
      ip: '192.168.31.135',
      rssi: -52 - Math.round(Math.random() * 8),
      hostname: 'savings-esp32.local',
      time_synced: true,
      date: todayISO(),
      datetime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      database: 'ok',
      free_heap: heapFree,
      memory: {
        heap_total: 310_356,
        heap_free: heapFree,
        heap_min_free: 170_472,
        heap_max_alloc: 110_580,
        psram_total: 0,
        psram_free: 0,
        flash_size: 4_194_304,
        sketch_size: 1_363_888,
        sketch_free: 2_949_120,
      },
    };
  },

  async listAssets(): Promise<Asset[]> {
    await delay();
    return [...db.assets].sort((a, b) => a.id.localeCompare(b.id));
  },

  async getAsset(id: string): Promise<Asset> {
    await delay(150);
    const a = db.assets.find((x) => x.id === id);
    if (!a) throw new ApiError(404, { error: 'ASSET_NOT_FOUND', message: `Asset ${id} does not exist` });
    return a;
  },

  async createAsset(input: AssetInput): Promise<Asset> {
    await delay();
    const id = String(input.id ?? '').trim();
    if (!id) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'id is required' });
    if (db.assets.some((a) => a.id === id))
      throw new ApiError(409, { error: 'DUPLICATE_ID', message: `Asset ${id} already exists` });
    if (db.assets.length >= MAX_ASSETS)
      throw new ApiError(409, { error: 'LIMIT_REACHED', message: `Maximum of ${MAX_ASSETS} assets reached` });
    const asset = coerceAsset(input, id);
    validateAsset(asset);
    db.assets.push(asset);
    save(db);
    return asset;
  },

  async updateAsset(id: string, input: AssetInput): Promise<Asset> {
    await delay();
    const idx = db.assets.findIndex((a) => a.id === id);
    if (idx < 0) throw new ApiError(404, { error: 'ASSET_NOT_FOUND', message: `Asset ${id} does not exist` });
    const asset = coerceAsset(input, id);
    validateAsset(asset);
    db.assets[idx] = asset;
    save(db);
    return asset;
  },

  async deleteAsset(id: string): Promise<{ deleted: string }> {
    await delay();
    const exists = db.assets.some((a) => a.id === id);
    if (!exists) throw new ApiError(404, { error: 'ASSET_NOT_FOUND', message: `Asset ${id} does not exist` });
    const used = db.recurring.find(
      (r) => r.active && (r.asset_id === id || r.target_bank_id === id),
    );
    if (used)
      throw new ApiError(409, {
        error: 'ASSET_IN_USE',
        message: `Asset ${id} is referenced by an active recurring rule`,
      });
    db.assets = db.assets.filter((a) => a.id !== id);
    save(db);
    return { deleted: id };
  },

  async listRecurring(): Promise<RecurringRule[]> {
    await delay();
    return db.recurring
      .map((r) => withStatus(r))
      .sort((a, b) => a.id.localeCompare(b.id));
  },

  async listPendingRecurring(): Promise<RecurringRule[]> {
    await delay();
    return db.recurring
      .map((r) => withStatus(r, true))
      .filter(isPending)
      .sort((a, b) => a.next_run.localeCompare(b.next_run));
  },

  async getRecurring(id: string): Promise<RecurringRule> {
    await delay(150);
    const r = db.recurring.find((x) => x.id === id);
    if (!r) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    return withStatus(r);
  },

  async createRecurring(input: RecurringInput): Promise<RecurringRule> {
    await delay();
    const id = String(input.id ?? '').trim();
    if (!id) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'id is required' });
    if (db.recurring.some((r) => r.id === id))
      throw new ApiError(409, { error: 'DUPLICATE_ID', message: `Recurring rule ${id} already exists` });
    if (db.recurring.length >= MAX_RECURRING)
      throw new ApiError(409, { error: 'LIMIT_REACHED', message: `Maximum of ${MAX_RECURRING} recurring rules reached` });
    validateRecurring(input);
    const row = {
      id,
      asset_id: input.asset_id,
      repeat_type: input.repeat_type,
      next_run: input.next_run,
      interest_mode: input.interest_mode,
      target_bank_id: input.target_bank_id || null,
      auto_enabled: input.auto_enabled ?? false,
      last_run: null as string | null,
      active: input.active ?? true,
      comment: input.comment?.toString().trim() || null,
    };
    db.recurring.push(row);
    save(db);
    return withStatus(row);
  },

  async updateRecurring(id: string, input: RecurringInput): Promise<RecurringRule> {
    await delay();
    const idx = db.recurring.findIndex((r) => r.id === id);
    if (idx < 0) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    validateRecurring(input);
    const prev = db.recurring[idx];
    db.recurring[idx] = {
      ...prev,
      asset_id: input.asset_id,
      repeat_type: input.repeat_type,
      next_run: input.next_run,
      interest_mode: input.interest_mode,
      target_bank_id: input.target_bank_id || null,
      auto_enabled: input.auto_enabled ?? prev.auto_enabled,
      active: input.active ?? prev.active,
      comment: input.comment?.toString().trim() || null,
    };
    save(db);
    return withStatus(db.recurring[idx]);
  },

  async deleteRecurring(id: string): Promise<{ deleted: string }> {
    await delay();
    const exists = db.recurring.some((r) => r.id === id);
    if (!exists) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    db.recurring = db.recurring.filter((r) => r.id !== id);
    save(db);
    return { deleted: id };
  },

  async processRecurring(id: string): Promise<ProcessResult> {
    await delay(420);
    const r = db.recurring.find((x) => x.id === id);
    if (!r) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    if (!r.active) throw new ApiError(409, { error: 'RECURRING_INACTIVE', message: `Recurring rule ${id} is not active` });
    const src = db.assets.find((a) => a.id === r.asset_id);
    if (!src) throw new ApiError(409, { error: 'SOURCE_INACTIVE', message: `Source asset ${r.asset_id} does not exist` });
    if (!src.active) throw new ApiError(409, { error: 'SOURCE_INACTIVE', message: `Source asset ${src.id} is not active` });
    if (r.next_run.localeCompare(todayISO()) > 0)
      throw new ApiError(409, { error: 'NOT_DUE', message: `Recurring rule ${id} is not due until ${r.next_run}` });
    if (r.last_run && r.last_run === r.next_run)
      throw new ApiError(409, { error: 'ALREADY_PROCESSED', message: `Occurrence ${r.next_run} of rule ${id} was already processed` });

    const interest = occurrenceInterest(src.amount, src.interest_rate, r.repeat_type);
    let bankCredited = 0;
    let sourceDelta = 0;

    if (src.interest_type === 'CUMULATIVE') {
      src.amount = Math.round((src.amount + interest) * 100) / 100;
      sourceDelta = interest;
    } else if (r.target_bank_id) {
      const bank = db.assets.find((a) => a.id === r.target_bank_id);
      if (!bank) throw new ApiError(500, { error: 'DB_ERROR', message: 'target bank vanished' });
      bank.amount = Math.round((bank.amount + interest) * 100) / 100;
      bankCredited = interest;
    }

    const occurrence = r.next_run;
    r.last_run = occurrence;
    r.next_run = advanceDate(occurrence, r.repeat_type);
    save(db);

    return {
      id,
      processed_occurrences: 1,
      bank_credited: bankCredited,
      source_delta: sourceDelta,
      target_bank_id: r.target_bank_id,
      last_run: occurrence,
      next_run: r.next_run,
    };
  },

  async skipRecurring(id: string): Promise<SkipResult> {
    await delay(320);
    const r = db.recurring.find((x) => x.id === id);
    if (!r) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    r.next_run = advanceDate(r.next_run, r.repeat_type);
    save(db);
    return { id, skipped: true, next_run: r.next_run };
  },

  async setRecurringAuto(id: string, auto_enabled: boolean): Promise<RecurringRule> {
    await delay(220);
    const r = db.recurring.find((x) => x.id === id);
    if (!r) throw new ApiError(404, { error: 'RECURRING_NOT_FOUND', message: `Recurring rule ${id} does not exist` });
    if (typeof auto_enabled !== 'boolean')
      throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'auto_enabled must be a boolean' });
    r.auto_enabled = auto_enabled;
    save(db);
    return withStatus(r);
  },

  async listMemory(filters?: MemoryFilters): Promise<MemoryEntry[]> {
    await delay();
    let rows = [...db.memory];
    for (const f of ['entity', 'owner', 'name', 'key'] as const) {
      const v = filters?.[f];
      if (v) rows = rows.filter((r) => r[f] === v);
    }
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async getMemory(id: string): Promise<MemoryEntry> {
    await delay(150);
    const r = db.memory.find((x) => x.id === id);
    if (!r) throw new ApiError(404, { error: 'MEMORY_NOT_FOUND', message: `Memory row ${id} does not exist` });
    return r;
  },

  async createMemory(input: MemoryInput): Promise<MemoryEntry> {
    await delay();
    const row = coerceMemory(input, String(input.id ?? '').trim() || genMemId());
    validateMemory(row);
    if (db.memory.some((m) => m.id === row.id))
      throw new ApiError(409, { error: 'DUPLICATE_ID', message: `Memory row ${row.id} already exists` });
    if (db.memory.length >= MAX_MEMORY)
      throw new ApiError(409, { error: 'LIMIT_REACHED', message: `Maximum of ${MAX_MEMORY} memory rows reached` });
    db.memory.push(row);
    save(db);
    return row;
  },

  async updateMemory(id: string, input: MemoryInput): Promise<MemoryEntry> {
    await delay();
    const idx = db.memory.findIndex((m) => m.id === id);
    if (idx < 0) throw new ApiError(404, { error: 'MEMORY_NOT_FOUND', message: `Memory row ${id} does not exist` });
    const row = coerceMemory(input, id);
    validateMemory(row);
    db.memory[idx] = row;
    save(db);
    return row;
  },

  async deleteMemory(id: string): Promise<{ deleted: string }> {
    await delay();
    if (!db.memory.some((m) => m.id === id))
      throw new ApiError(404, { error: 'MEMORY_NOT_FOUND', message: `Memory row ${id} does not exist` });
    db.memory = db.memory.filter((m) => m.id !== id);
    save(db);
    return { deleted: id };
  },
};

function coerceMemory(input: MemoryInput, id: string): MemoryEntry {
  return {
    id,
    entity: String(input.entity ?? '').trim(),
    owner: String(input.owner ?? '').trim(),
    name: String(input.name ?? '').trim(),
    key: String(input.key ?? ''),
  };
}

function validateMemory(m: MemoryEntry) {
  if (!m.name) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'name is required' });
  if (m.id.length > 64) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'id must be <= 64 chars' });
  if (m.entity.length > 128) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'entity must be <= 128 chars' });
  if (m.owner.length > 128) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'owner must be <= 128 chars' });
  if (m.name.length > 128) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'name must be <= 128 chars' });
  if (m.key.length > 256) throw new ApiError(400, { error: 'VALIDATION_ERROR', message: 'key must be <= 256 chars' });
}

export type MockApi = typeof mockApi;
