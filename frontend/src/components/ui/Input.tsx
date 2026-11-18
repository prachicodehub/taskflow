import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const FIELD =
  'block w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-4';
const fieldState = (error?: string) =>
  error
    ? 'border-flag-500 focus:ring-flag-500/15'
    : 'border-ink-200 hover:border-ink-300 focus:border-ink-700 focus:ring-signal-400/35';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-flag-700">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Input({ label, error, hint, id, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint}>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`${FIELD} ${fieldState(error)} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export function Textarea({ label, error, id, className = '', ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} error={error}>
      <textarea
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`${FIELD} ${fieldState(error)} min-h-24 resize-y ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string };

export function Select({ label, error, id, className = '', children, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} error={error}>
      <select id={inputId} aria-invalid={!!error} className={`${FIELD} ${fieldState(error)} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}
