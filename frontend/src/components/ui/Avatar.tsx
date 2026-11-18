const TONES = [
  'bg-ink-800 text-signal-400',
  'bg-calm-700 text-white',
  'bg-signal-500 text-ink-900',
  'bg-flag-700 text-white',
  'bg-ink-600 text-white',
];

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Initials in a colour picked from the user id, so the same person always looks the same. */
export function Avatar({ id, name, size = 'sm' }: { id: number; name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'h-9 w-9 text-sm' : 'h-6 w-6 text-[10px]';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${TONES[id % TONES.length]}`}
    >
      {initialsOf(name)}
    </span>
  );
}
