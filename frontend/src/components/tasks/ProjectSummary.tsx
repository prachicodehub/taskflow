import type { ProjectSummary as Summary, TaskStatus } from '../../types/api';
import { StatusGlyph } from './TaskBoard';

/** One segmented bar shows how the project's work is split across the three stages. */
export function ProjectSummary({ summary }: { summary: Summary }) {
  const { total } = summary;
  const donePct = total ? Math.round((summary.done / total) * 100) : 0;
  const segments: { status: TaskStatus; label: string; value: number; color: string }[] = [
    { status: 'DONE', label: 'Done', value: summary.done, color: 'bg-calm-500' },
    { status: 'IN_PROGRESS', label: 'In progress', value: summary.inProgress, color: 'bg-signal-500' },
    { status: 'TODO', label: 'To do', value: summary.todo, color: 'bg-ink-300' },
  ];

  return (
    <section aria-label="Project summary" className="rounded-[16px] bg-white p-5 ring-1 ring-ink-200 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <p className="text-ink-600">
          <span className="font-display text-3xl font-bold text-ink-900 tabular-nums">{donePct}%</span>
          <span className="ml-2">
            done, {summary.done} of {total} {total === 1 ? 'task' : 'tasks'}
          </span>
        </p>
        {summary.overdue > 0 ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-flag-50 px-3 py-1 text-sm font-semibold text-flag-700">
            <span className="h-2 w-2 rounded-full bg-flag-500" aria-hidden="true" />
            {summary.overdue} overdue
          </p>
        ) : (
          <p className="text-sm text-ink-500">Nothing overdue</p>
        )}
      </div>

      <div
        className="mt-4 flex h-3 gap-[3px] overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={donePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tasks done"
      >
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div key={s.status} className={`${s.color} h-full transition-[width] duration-500`} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {[...segments].reverse().map((s) => (
          <div key={s.status} className="flex items-center gap-2">
            <StatusGlyph status={s.status} className="h-3.5 w-3.5" />
            <dt className="text-ink-600">{s.label}</dt>
            <dd className="font-semibold tabular-nums text-ink-900">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
