import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './primitives';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'drawer' | 'center';
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, subtitle, children, footer, variant = 'drawer', size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const panelMotion =
    variant === 'drawer'
      ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
      : { initial: { y: 24, opacity: 0, scale: 0.97 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: 12, opacity: 0, scale: 0.98 } };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`modal-root modal-root--${variant}`}>
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`modal-panel modal-panel--${variant} modal-panel--${size}`}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            {...panelMotion}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-panel__head">
              <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <IconButton label="Close" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </header>
            <div className="modal-panel__body">{children}</div>
            {footer && <footer className="modal-panel__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
