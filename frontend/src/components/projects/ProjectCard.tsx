import { Link } from 'react-router-dom';
import type { Project } from '../../types/api';
import { initialsOf } from '../ui/Avatar';

const MONOGRAM_TONES = [
  'bg-ink-900 text-signal-400',
  'bg-calm-700 text-white',
  'bg-signal-500 text-ink-900',
  'bg-flag-500 text-white',
  'bg-ink-600 text-white',
];

export function ProjectCard({ project }: { project: Project }) {
  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex h-full flex-col rounded-[14px] bg-white p-5 ring-1 ring-ink-200 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(20,33,61,0.35)] hover:ring-ink-300"
    >
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 items-center justify-center rounded-[11px] font-display text-base font-bold ${MONOGRAM_TONES[project.id % MONOGRAM_TONES.length]}`}
      >
        {initialsOf(project.name) || '#'}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-ink-900 group-hover:underline group-hover:decoration-signal-500 group-hover:decoration-2 group-hover:underline-offset-4">
        {project.name}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-500">
        {project.description || <span className="italic text-ink-400">No description</span>}
      </p>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-400">
        <span>Created {created}</span>
        <span className="font-medium text-ink-600 opacity-0 transition-opacity group-hover:opacity-100">Open board</span>
      </div>
    </Link>
  );
}

export function NewProjectTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-ink-200 text-ink-500 transition hover:border-ink-400 hover:bg-white/60 hover:text-ink-900"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-ink-200">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M10 4.5v11M4.5 10h11" />
        </svg>
      </span>
      <span className="text-sm font-semibold">New project</span>
    </button>
  );
}
