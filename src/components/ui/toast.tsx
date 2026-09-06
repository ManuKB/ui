import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warn';
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 1;

function emit() {
  toasts = [...toasts];
  listeners.forEach((l) => l());
}

export function pushToast(tone: ToastTone, title: string, message?: string) {
  const id = seq++;
  toasts.push({ id, tone, title, message });
  emit();
  setTimeout(() => dismissToast(id), tone === 'error' ? 7000 : 4200);
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (t: string, m?: string) => pushToast('success', t, m),
  error: (t: string, m?: string) => pushToast('error', t, m),
  info: (t: string, m?: string) => pushToast('info', t, m),
  warn: (t: string, m?: string) => pushToast('warn', t, m),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warn: TriangleAlert };

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts);
  return (
    <div className="toast-viewport" role="region" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`toast toast--${t.tone}`}
            >
              <Icon size={18} className="toast__icon" />
              <div className="toast__body">
                <strong>{t.title}</strong>
                {t.message && <span>{t.message}</span>}
              </div>
              <button className="toast__close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
