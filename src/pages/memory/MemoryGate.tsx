import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, LockKeyhole, Delete } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { Card, Button } from '@/components/ui/primitives';

// Passcodes gating the Memory (secure key store) page.
const PASSCODE: Record<'demo' | 'live', string> = {
  demo: '11111',
  live: '17021998',
};
const SS_KEY = 'savings-tracker:memory-unlocked';

export function MemoryGate({ children }: { children: ReactNode }) {
  const { mode } = useSettings();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SS_KEY) === mode;
    } catch {
      return false;
    }
  });
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const expected = PASSCODE[mode];

  // Re-lock whenever the data source changes.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SS_KEY) !== mode) setUnlocked(false);
    } catch {
      /* ignore */
    }
    setEntry('');
    setError(false);
  }, [mode]);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  const submit = (code: string) => {
    if (code === expected) {
      try {
        sessionStorage.setItem(SS_KEY, mode);
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError(true);
      setShake((s) => s + 1);
      setEntry('');
    }
  };

  if (unlocked) return <>{children}</>;

  const press = (d: string) => {
    setError(false);
    const next = (entry + d).slice(0, 12);
    setEntry(next);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="page-head__crumb">Restricted</p>
          <h2 className="page-head__title">Memory — secure key store</h2>
          <p className="page-head__sub">Enter the passcode to view stored keys &amp; tokens</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="gate">
          <div className="gate__icon">
            <LockKeyhole size={26} />
          </div>
          <h3>Passcode required</h3>
          <p className="gate__hint">
            This section stores account numbers, PINs and API tokens. Access is gated with a{' '}
            {mode === 'demo' ? 'demo' : 'private'} passcode.
          </p>

          <motion.form
            key={shake}
            className="gate__form"
            initial={error ? { x: -8 } : false}
            animate={error ? { x: [8, -8, 6, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit(entry);
            }}
          >
            <input
              ref={inputRef}
              className={`input gate__input mono ${error ? 'gate__input--error' : ''}`}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••••"
              value={entry}
              onChange={(e) => {
                setError(false);
                setEntry(e.target.value.replace(/\D/g, '').slice(0, 12));
              }}
              aria-label="Passcode"
              aria-invalid={error}
            />

            <div className="gate__pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((d, i) =>
                d === '' ? (
                  <span key={i} />
                ) : d === 'del' ? (
                  <button key={i} type="button" className="gate__key gate__key--fn" onClick={() => { setError(false); setEntry((v) => v.slice(0, -1)); }} aria-label="Delete">
                    <Delete size={18} />
                  </button>
                ) : (
                  <button key={i} type="button" className="gate__key" onClick={() => press(d)}>
                    {d}
                  </button>
                ),
              )}
            </div>

            {error && <p className="gate__error">Incorrect passcode. Try again.</p>}

            <Button type="submit" block icon={<ShieldCheck size={16} />} disabled={entry.length === 0}>
              Unlock
            </Button>
          </motion.form>
        </Card>
      </motion.div>
    </div>
  );
}
