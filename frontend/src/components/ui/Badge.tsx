import { PRIORITY_LABELS, type TaskPriority } from '../../types/api';

/** Priority colour, used for the card stripe and the label dot. */
export const PRIORITY_BG: Record<TaskPriority, string> = {
  HIGH: 'bg-flag-500',
  MEDIUM: 'bg-signal-500',
  LOW: 'bg-calm-500',
};

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  HIGH: 'text-flag-700',
  MEDIUM: 'text-signal-700',
  LOW: 'text-calm-700',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${PRIORITY_TEXT[priority]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_BG[priority]}`} aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
