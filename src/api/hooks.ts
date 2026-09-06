import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSettings } from '@/context/SettingsContext';
import { toast } from '@/components/ui/toast';
import { ApiError, type AssetInput, type RecurringInput } from '@/types/api';

const k = {
  status: ['system-status'] as const,
  assets: ['assets'] as const,
  asset: (id: string) => ['assets', id] as const,
  recurring: ['recurring'] as const,
  recurringOne: (id: string) => ['recurring', id] as const,
  pending: ['recurring', 'pending'] as const,
};

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : (e as Error)?.message ?? 'Unexpected error');

export function useSystemStatus(opts?: { poll?: boolean }) {
  const { api, mode } = useSettings();
  return useQuery({
    queryKey: [...k.status, mode],
    queryFn: () => api.getSystemStatus(),
    refetchInterval: opts?.poll ? 15_000 : false,
    retry: 0,
  });
}

export function useAssets() {
  const { api, mode } = useSettings();
  return useQuery({ queryKey: [...k.assets, mode], queryFn: () => api.listAssets() });
}

export function useRecurring() {
  const { api, mode } = useSettings();
  return useQuery({ queryKey: [...k.recurring, mode], queryFn: () => api.listRecurring() });
}

export function usePendingRecurring() {
  const { api, mode } = useSettings();
  return useQuery({
    queryKey: [...k.pending, mode],
    queryFn: () => api.listPendingRecurring(),
    retry: 0,
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['recurring'] });
    qc.invalidateQueries({ queryKey: ['system-status'] });
  };
}

export function useAssetMutations() {
  const { api } = useSettings();
  const invalidate = useInvalidateAll();

  const create = useMutation({
    mutationFn: (input: AssetInput) => api.createAsset(input),
    onSuccess: (a) => {
      invalidate();
      toast.success('Asset created', `${a.id} · ${a.name}`);
    },
    onError: (e) => toast.error('Could not create asset', errMsg(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssetInput }) => api.updateAsset(id, input),
    onSuccess: (a) => {
      invalidate();
      toast.success('Asset updated', `${a.id} · ${a.name}`);
    },
    onError: (e) => toast.error('Could not update asset', errMsg(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: (r) => {
      invalidate();
      toast.success('Asset deleted', r.deleted);
    },
    onError: (e) => toast.error('Could not delete asset', errMsg(e)),
  });

  return { create, update, remove };
}

export function useRecurringMutations() {
  const { api } = useSettings();
  const invalidate = useInvalidateAll();

  const create = useMutation({
    mutationFn: (input: RecurringInput) => api.createRecurring(input),
    onSuccess: (r) => {
      invalidate();
      toast.success('Recurring rule created', r.id);
    },
    onError: (e) => toast.error('Could not create rule', errMsg(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecurringInput }) => api.updateRecurring(id, input),
    onSuccess: (r) => {
      invalidate();
      toast.success('Recurring rule updated', r.id);
    },
    onError: (e) => toast.error('Could not update rule', errMsg(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteRecurring(id),
    onSuccess: (r) => {
      invalidate();
      toast.success('Recurring rule deleted', r.deleted);
    },
    onError: (e) => toast.error('Could not delete rule', errMsg(e)),
  });

  const process = useMutation({
    mutationFn: (id: string) => api.processRecurring(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error('Could not process', errMsg(e)),
  });

  const skip = useMutation({
    mutationFn: (id: string) => api.skipRecurring(id),
    onSuccess: (r) => {
      invalidate();
      toast.info('Occurrence skipped', `Next run ${r.next_run}`);
    },
    onError: (e) => toast.error('Could not skip', errMsg(e)),
  });

  const setAuto = useMutation({
    mutationFn: ({ id, auto }: { id: string; auto: boolean }) => api.setRecurringAuto(id, auto),
    onSuccess: (r) => {
      invalidate();
      toast.success(r.auto_enabled ? 'Automatic processing on' : 'Automatic processing off', r.id);
    },
    onError: (e) => toast.error('Could not update automation', errMsg(e)),
  });

  return { create, update, remove, process, skip, setAuto };
}
