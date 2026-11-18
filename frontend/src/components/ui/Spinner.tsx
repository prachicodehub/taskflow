export function Spinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const dims = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-9 w-9 border-[3px]' : 'h-6 w-6 border-2';
  return (
    <span role="status" aria-label={label ?? 'Loading'} className="inline-flex items-center gap-2">
      <span className={`${dims} animate-spin rounded-full border-current border-t-transparent opacity-80`} />
      {label && <span className="text-sm text-ink-500">{label}</span>}
    </span>
  );
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-ink-700">
      <Spinner size="lg" label={label} />
    </div>
  );
}
