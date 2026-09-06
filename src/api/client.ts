import {
  ApiError,
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

export interface LiveApi {
  getSystemStatus(): Promise<SystemStatus>;
  listAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset>;
  createAsset(input: AssetInput): Promise<Asset>;
  updateAsset(id: string, input: AssetInput): Promise<Asset>;
  deleteAsset(id: string): Promise<{ deleted: string }>;
  listRecurring(): Promise<RecurringRule[]>;
  listPendingRecurring(): Promise<RecurringRule[]>;
  getRecurring(id: string): Promise<RecurringRule>;
  createRecurring(input: RecurringInput): Promise<RecurringRule>;
  updateRecurring(id: string, input: RecurringInput): Promise<RecurringRule>;
  deleteRecurring(id: string): Promise<{ deleted: string }>;
  processRecurring(id: string): Promise<ProcessResult>;
  skipRecurring(id: string): Promise<SkipResult>;
  setRecurringAuto(id: string, auto_enabled: boolean): Promise<RecurringRule>;
  listMemory(filters?: MemoryFilters): Promise<MemoryEntry[]>;
  getMemory(id: string): Promise<MemoryEntry>;
  createMemory(input: MemoryInput): Promise<MemoryEntry>;
  updateMemory(id: string, input: MemoryInput): Promise<MemoryEntry>;
  deleteMemory(id: string): Promise<{ deleted: string }>;
}

export function createLiveApi(getBaseUrl: () => string): LiveApi {
  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const base = getBaseUrl().replace(/\/+$/, '');
    let res: Response;
    try {
      res = await fetch(base + path, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers ?? {}) },
        signal: init?.signal ?? AbortSignal.timeout(12_000),
      });
    } catch (e) {
      const msg =
        location.protocol === 'https:' && base.startsWith('http:')
          ? 'Blocked: this page is served over HTTPS and cannot call a plain-HTTP device (mixed content). Open the app over http:// or use a TLS proxy.'
          : `Cannot reach ${base} — check the device URL, that you are on the same network, and that CORS is enabled on the firmware. (${(e as Error).message})`;
      throw new ApiError(0, { error: 'NETWORK_ERROR', message: msg });
    }

    const text = await res.text();
    const body = text ? safeJson(text) : null;
    if (!res.ok) {
      throw new ApiError(res.status, (body as { error: string; message: string }) ?? `HTTP ${res.status}`);
    }
    return body as T;
  }

  const json = (data: unknown) => ({ body: JSON.stringify(data) });

  return {
    getSystemStatus: () => req('/api/system/status'),
    listAssets: () => req('/api/assets'),
    getAsset: (id) => req(`/api/assets/${encodeURIComponent(id)}`),
    createAsset: (input) => req('/api/assets', { method: 'POST', ...json(input) }),
    updateAsset: (id, input) => req(`/api/assets/${encodeURIComponent(id)}`, { method: 'PUT', ...json(input) }),
    deleteAsset: (id) => req(`/api/assets/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    listRecurring: () => req('/api/recurring'),
    listPendingRecurring: () => req('/api/recurring/pending'),
    getRecurring: (id) => req(`/api/recurring/${encodeURIComponent(id)}`),
    createRecurring: (input) => req('/api/recurring', { method: 'POST', ...json(input) }),
    updateRecurring: (id, input) => req(`/api/recurring/${encodeURIComponent(id)}`, { method: 'PUT', ...json(input) }),
    deleteRecurring: (id) => req(`/api/recurring/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    processRecurring: (id) => req(`/api/recurring/${encodeURIComponent(id)}/process`, { method: 'POST' }),
    skipRecurring: (id) => req(`/api/recurring/${encodeURIComponent(id)}/skip`, { method: 'POST' }),
    setRecurringAuto: (id, auto_enabled) =>
      req(`/api/recurring/${encodeURIComponent(id)}/auto`, { method: 'PUT', ...json({ auto_enabled }) }),
    listMemory: (filters) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filters ?? {})) if (v) qs.set(k, v);
      const suffix = qs.toString() ? `?${qs}` : '';
      return req(`/api/memory${suffix}`);
    },
    getMemory: (id) => req(`/api/memory/${encodeURIComponent(id)}`),
    createMemory: (input) => req('/api/memory', { method: 'POST', ...json(input) }),
    updateMemory: (id, input) => req(`/api/memory/${encodeURIComponent(id)}`, { method: 'PUT', ...json(input) }),
    deleteMemory: (id) => req(`/api/memory/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'BAD_RESPONSE', message: text.slice(0, 200) };
  }
}
