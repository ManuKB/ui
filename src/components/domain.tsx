import {
  Landmark,
  PiggyBank,
  TrendingUp,
  Scroll,
  HandCoins,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AssetType, RecurringStatus } from '@/types/api';
import { Badge } from './ui/primitives';
import { STATUS_META } from '@/lib/recurring';

export const ASSET_TYPE_META: Record<AssetType, { label: string; icon: LucideIcon; color: string }> = {
  BANK: { label: 'Bank', icon: Landmark, color: 'var(--brand-400)' },
  FD: { label: 'Fixed Deposit', icon: PiggyBank, color: 'var(--accent-cyan)' },
  STOCK: { label: 'Stocks', icon: TrendingUp, color: 'var(--accent-emerald)' },
  BOND: { label: 'Bonds', icon: Scroll, color: 'var(--accent-violet)' },
  LENDING: { label: 'Lending', icon: HandCoins, color: 'var(--accent-amber)' },
  CASH: { label: 'Cash', icon: Wallet, color: '#94a3b8' },
};

export function AssetTypeIcon({ type, size = 16 }: { type: AssetType; size?: number }) {
  const Icon = ASSET_TYPE_META[type].icon;
  return <Icon size={size} style={{ color: ASSET_TYPE_META[type].color }} />;
}

export function AssetAvatar({ type, size = 40 }: { type: AssetType; size?: number }) {
  const meta = ASSET_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className="asset-avatar"
      style={{ width: size, height: size, color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)` }}
    >
      <Icon size={size * 0.5} />
    </span>
  );
}

const TONE_MAP: Record<string, 'muted' | 'info' | 'success' | 'warn' | 'danger'> = {
  info: 'info',
  warn: 'warn',
  danger: 'danger',
  success: 'success',
  muted: 'muted',
};

export function StatusBadge({ status }: { status: RecurringStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={TONE_MAP[meta.tone]} dot>
      {meta.label}
    </Badge>
  );
}
