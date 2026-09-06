import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  BellRing,
  Cpu,
  Settings,
  X,
} from 'lucide-react';
import { usePendingRecurring } from '@/api/hooks';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Wallet },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/pending', label: 'Pending actions', icon: BellRing, badgeKey: 'pending' as const },
  { to: '/system', label: 'Device', icon: Cpu },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pending = usePendingRecurring();
  const pendingCount = pending.data?.length ?? 0;

  return (
    <>
      <motion.div
        className="sidebar-scrim"
        initial={false}
        animate={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
              <rect width="32" height="32" rx="9" fill="url(#lg)" />
              <path d="M8 20l5-7 4 3 7-10" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div className="sidebar__title">
            <strong>Savings Tracker</strong>
            <span>ESP32 asset console</span>
          </div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `navitem ${isActive ? 'is-active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-active" className="navitem__pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <item.icon size={18} className="navitem__icon" />
                  <span className="navitem__label">{item.label}</span>
                  {item.badgeKey === 'pending' && pendingCount > 0 && (
                    <span className="navitem__badge">{pendingCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <p>Firmware API v1.0.0</p>
          <p className="mono">max 100 assets · 100 rules</p>
        </div>
      </aside>
    </>
  );
}
