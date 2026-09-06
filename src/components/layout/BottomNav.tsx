import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  BellRing,
  MoreHorizontal,
  KeyRound,
  Cpu,
  Settings as SettingsIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { usePendingRecurring } from '@/api/hooks';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: 'pending';
}

const PRIMARY: Tab[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Wallet },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/pending', label: 'Alerts', icon: BellRing, badge: 'pending' },
];

const MORE: Tab[] = [
  { to: '/memory', label: 'Memory', icon: KeyRound },
  { to: '/system', label: 'Device', icon: Cpu },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function BottomNav() {
  const pending = usePendingRecurring();
  const pendingCount = pending.data?.length ?? 0;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  const moreActive = MORE.some((m) => pathname.startsWith(m.to) && m.to !== '/');

  return (
    <>
      <nav className="bottomnav" aria-label="Primary">
        {PRIMARY.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `bnav ${isActive ? 'is-active' : ''}`}>
            {({ isActive }) => (
              <>
                <span className="bnav__icon">
                  {isActive && (
                    <motion.span layoutId="bnav-pill" className="bnav__pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <t.icon size={22} />
                  {t.badge === 'pending' && pendingCount > 0 && <span className="bnav__badge">{pendingCount > 9 ? '9+' : pendingCount}</span>}
                </span>
                <span className="bnav__label">{t.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button type="button" className={`bnav ${moreActive || sheetOpen ? 'is-active' : ''}`} onClick={() => setSheetOpen(true)} aria-haspopup="menu" aria-expanded={sheetOpen}>
          <span className="bnav__icon">
            {(moreActive || sheetOpen) && <span className="bnav__pill" />}
            <MoreHorizontal size={22} />
          </span>
          <span className="bnav__label">More</span>
        </button>
      </nav>

      {createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <div className="sheet-root">
              <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)} />
              <motion.div
                className="sheet"
                role="menu"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              >
                <div className="sheet__grip" />
                <header className="sheet__head">
                  <h2>More</h2>
                  <button className="icon-btn" aria-label="Close" onClick={() => setSheetOpen(false)}>
                    <X size={18} />
                  </button>
                </header>
                <div className="sheet__list">
                  {MORE.map((m) => (
                    <button
                      key={m.to}
                      type="button"
                      role="menuitem"
                      className={`sheet__item ${pathname.startsWith(m.to) ? 'is-active' : ''}`}
                      onClick={() => {
                        navigate(m.to);
                        setSheetOpen(false);
                      }}
                    >
                      <m.icon size={20} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
