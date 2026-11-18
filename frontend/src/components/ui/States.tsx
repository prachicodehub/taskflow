import type { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
      <EmptyBoardIcon />
      <h3 className="mt-4 text-lg font-semibold text-ink-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function EmptyBoardIcon() {
  return (
    <svg viewBox="0 0 64 48" className="h-12 w-16" aria-hidden="true">
      <rect x="1" y="1" width="18" height="46" rx="4" fill="#e7ebf1" />
      <rect x="23" y="1" width="18" height="46" rx="4" fill="#e7ebf1" />
      <rect x="45" y="1" width="18" height="46" rx="4" fill="#e7ebf1" />
      <rect x="4" y="5" width="12" height="9" rx="2" fill="#fff" stroke="#b5bfd1" />
      <rect x="26" y="5" width="12" height="9" rx="2" fill="#f5c518" />
      <rect x="4" y="17" width="12" height="9" rx="2" fill="#fff" stroke="#b5bfd1" />
    </svg>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[14px] bg-flag-50 px-6 py-10 text-center ring-1 ring-flag-500/25">
      <p className="text-sm font-medium text-flag-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-[10px] border-l-4 border-flag-500 bg-flag-50 px-3.5 py-2.5 text-sm font-medium text-flag-700">
      {children}
    </div>
  );
}
