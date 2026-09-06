import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from './toast';

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback for insecure contexts / older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** Read-only masked value with reveal + copy — used in the Memory `key` column. */
export function SecretText({ value, label = 'value' }: { value: string; label?: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const empty = !value;

  const onCopy = async () => {
    if (empty) return;
    if (await copy(value)) {
      setCopied(true);
      toast.success('Copied', `${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 1400);
    } else {
      toast.error('Copy failed');
    }
  };

  return (
    <span className="secret">
      <span className={`secret__val mono ${shown ? '' : 'secret__val--masked'}`}>
        {empty ? <em className="dim">—</em> : shown ? value : '•'.repeat(Math.min(12, Math.max(6, value.length)))}
      </span>
      <button
        type="button"
        className="secret__btn"
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={shown}
        disabled={empty}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button
        type="button"
        className="secret__btn"
        aria-label={`Copy ${label}`}
        disabled={empty}
        onClick={onCopy}
      >
        {copied ? <Check size={14} className="secret__ok" /> : <Copy size={14} />}
      </button>
    </span>
  );
}

/** Editable password input with a reveal toggle — used in forms. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { showCopy?: boolean }>(
  function PasswordInput({ className = '', showCopy, value, ...rest }, ref) {
    const [shown, setShown] = useState(false);
    return (
      <span className="pw-input">
        <input
          ref={ref}
          type={shown ? 'text' : 'password'}
          className={`input ${shown ? 'mono' : ''} ${className}`}
          value={value}
          autoComplete="off"
          spellCheck={false}
          {...rest}
        />
        {showCopy && (
          <button
            type="button"
            className="pw-input__btn"
            aria-label="Copy"
            tabIndex={-1}
            onClick={() => copy(String(value ?? '')).then((ok) => (ok ? toast.success('Copied') : toast.error('Copy failed')))}
          >
            <Copy size={15} />
          </button>
        )}
        <button
          type="button"
          className="pw-input__btn"
          aria-label={shown ? 'Hide' : 'Show'}
          aria-pressed={shown}
          tabIndex={-1}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
    );
  },
);
