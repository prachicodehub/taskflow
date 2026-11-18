interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const PAGE_BTN =
  'flex h-8 w-8 items-center justify-center rounded-full text-ink-700 ring-1 ring-ink-200 bg-white hover:ring-ink-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:ring-ink-200';

export function Pagination({ page, totalPages, totalElements, size, onPageChange, onSizeChange }: PaginationProps) {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-600">
      <p>
        <span className="font-semibold text-ink-900 tabular-nums">
          {from}–{to}
        </span>{' '}
        of <span className="font-semibold text-ink-900 tabular-nums">{totalElements}</span> tasks
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Per page</span>
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="rounded-full border-0 bg-white py-1 pl-3 pr-7 font-semibold text-ink-800 ring-1 ring-ink-200"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" className={PAGE_BTN} disabled={page <= 0} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3.5L5.5 8l4.5 4.5" />
            </svg>
          </button>
          <span className="min-w-12 text-center tabular-nums">
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className={PAGE_BTN}
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3.5L10.5 8 6 12.5" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
