import { useState, type DragEvent } from 'react';
import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from '../../types/api';
import { TASK_DRAG_TYPE, TaskCard } from './TaskCard';

/** Small glyph per column: empty ring → half-filled → check. Reads as progress at a glance. */
export function StatusGlyph({ status, className = 'h-4 w-4' }: { status: TaskStatus; className?: string }) {
  if (status === 'TODO') {
    return (
      <svg viewBox="0 0 16 16" className={`${className} text-ink-400`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="8" cy="8" r="6" />
      </svg>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="#f5c518" strokeWidth="2" />
        <path d="M8 4a4 4 0 0 1 0 8z" fill="#f5c518" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#2f8f7b" />
      <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TaskBoardProps {
  tasks: Task[];
  /** When the list is filtered to one status, the other columns explain why they're empty. */
  statusFilter?: TaskStatus;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onAdd: (status: TaskStatus) => void;
}

export function TaskBoard({ tasks, statusFilter, onEdit, onDelete, onStatusChange, onAdd }: TaskBoardProps) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-3 lg:gap-5">
      {TASK_STATUSES.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          hiddenByFilter={!!statusFilter && statusFilter !== status}
          onDropTask={(taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            if (task && task.status !== status) onStatusChange(task, status);
          }}
          onAdd={() => onAdd(status)}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  hiddenByFilter: boolean;
  onDropTask: (taskId: number) => void;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

function TaskColumn({ status, tasks, hiddenByFilter, onDropTask, onAdd, onEdit, onDelete, onStatusChange }: TaskColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const isTaskDrag = (e: DragEvent) => e.dataTransfer.types.includes(TASK_DRAG_TYPE);

  return (
    <section
      aria-label={`${STATUS_LABELS[status]} column`}
      onDragOver={(e) => {
        if (!isTaskDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        setDragOver(false);
        const id = Number(e.dataTransfer.getData(TASK_DRAG_TYPE));
        if (id) {
          e.preventDefault();
          onDropTask(id);
        }
      }}
      className={`flex min-h-56 flex-col rounded-[16px] p-2.5 transition-colors ${
        dragOver ? 'bg-signal-50 ring-2 ring-signal-500' : 'bg-ink-100/70'
      }`}
    >
      <header className="flex items-center gap-2 px-2 pb-3 pt-1.5">
        <StatusGlyph status={status} />
        <h3 className="text-base font-semibold text-ink-900">{STATUS_LABELS[status]}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-600 ring-1 ring-ink-200">
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
          className="ml-auto rounded-[8px] p-1 text-ink-500 hover:bg-white hover:text-ink-900"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M10 4.5v11M4.5 10h11" />
          </svg>
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-2.5">
        {tasks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-[10px] border-2 border-dashed border-ink-200 px-3 py-8 text-center text-sm text-ink-400">
            {hiddenByFilter ? 'Hidden by the status filter' : dragOver ? 'Drop to move here' : 'Nothing here yet'}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </section>
  );
}
