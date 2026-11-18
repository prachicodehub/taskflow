import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage, toApiError } from '../api/axiosClient';
import { Pagination } from '../components/tasks/Pagination';
import { ProjectSummary } from '../components/tasks/ProjectSummary';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { Button, PlusIcon } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageSpinner, Spinner } from '../components/ui/Spinner';
import { Alert, EmptyState, ErrorState } from '../components/ui/States';
import { useProjects, useProjectSummary, useTaskMutations, useTasks, useUsers } from '../hooks/queries';
import type { Task, TaskQuery, TaskStatus } from '../types/api';
import { NotFoundPage } from './NotFoundPage';

const DEFAULT_QUERY: TaskQuery = { sort: 'createdAt', direction: 'desc', page: 0, size: 50 };

export function ProjectBoardPage() {
  const projectId = Number(useParams().projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) return <NotFoundPage message="That project doesn't exist." />;
  // key: reset all board state when switching projects
  return <Board key={projectId} projectId={projectId} />;
}

function Board({ projectId }: { projectId: number }) {
  const [query, setQuery] = useState<TaskQuery>(DEFAULT_QUERY);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('TODO');
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const projects = useProjects();
  const summary = useProjectSummary(projectId);
  const tasks = useTasks(projectId, query);
  const users = useUsers();
  const { create, update, updateStatus, remove } = useTaskMutations(projectId);

  const project = projects.data?.find((p) => p.id === projectId);

  // The API answers 404 for projects that don't exist *or* belong to someone else.
  if (toApiError(summary.error)?.status === 404 || (projects.isSuccess && !project)) {
    return <NotFoundPage message="That project doesn't exist or you don't have access to it." />;
  }
  if (projects.isPending) return <PageSpinner label="Loading project…" />;

  const changeQuery = (patch: Partial<TaskQuery>) => setQuery((q) => ({ ...q, ...patch }));

  const changeStatus = (task: Task, status: TaskStatus) => {
    setActionError(null);
    updateStatus.mutate(
      { taskId: task.id, status },
      { onError: (err) => setActionError(`Couldn't move "${task.title}": ${errorMessage(err)}`) },
    );
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      await remove.mutateAsync(deleting.id);
    } catch (err) {
      setActionError(`Couldn't delete "${deleting.title}": ${errorMessage(err)}`);
    }
    setDeleting(null);
  };

  const page = tasks.data;
  const noTasksAtAll = summary.data?.total === 0;

  const openCreate = (status: TaskStatus = 'TODO') => {
    setCreateStatus(status);
    setCreating(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
            <Link to="/projects" className="hover:text-ink-900 hover:underline hover:decoration-signal-500 hover:decoration-2 hover:underline-offset-4">
              Projects
            </Link>
            <span className="mx-2 text-ink-300" aria-hidden="true">/</span>
            <span className="text-ink-700">{project?.name}</span>
          </nav>
          <h1 className="mt-2 truncate text-3xl font-bold text-ink-900 sm:text-4xl">{project?.name}</h1>
          {project?.description && <p className="mt-2 max-w-2xl text-ink-500">{project.description}</p>}
        </div>
        <Button variant="accent" onClick={() => openCreate()}>
          <PlusIcon />
          New task
        </Button>
      </div>

      {summary.data && <ProjectSummary summary={summary.data} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <TaskFilters query={query} users={users.data ?? []} onChange={changeQuery} />
        </div>
        {tasks.isFetching && !tasks.isPending && (
          <span className="text-ink-600">
            <Spinner size="sm" label="Updating…" />
          </span>
        )}
      </div>

      {actionError && <Alert>{actionError}</Alert>}

      {tasks.isPending ? (
        <PageSpinner label="Loading tasks…" />
      ) : tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error)} onRetry={() => tasks.refetch()} />
      ) : noTasksAtAll ? (
        <EmptyState
          title="No tasks yet"
          message="Add the first task to this project. You can drag tasks between columns as work moves along."
          action={
            <Button variant="accent" onClick={() => openCreate()}>
              <PlusIcon />
              Add the first task
            </Button>
          }
        />
      ) : (
        <>
          <div>
            {page && page.totalElements === 0 ? (
              <EmptyState
                title="No tasks match these filters"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => changeQuery({ status: undefined, priority: undefined, assigneeId: undefined, page: 0 })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <TaskBoard
                tasks={page?.content ?? []}
                statusFilter={query.status}
                onEdit={setEditing}
                onDelete={setDeleting}
                onStatusChange={changeStatus}
                onAdd={openCreate}
              />
            )}
          </div>
          {page && page.totalElements > 0 && (
            <Pagination
              page={page.page}
              size={query.size}
              totalPages={page.totalPages}
              totalElements={page.totalElements}
              onPageChange={(p) => changeQuery({ page: p })}
              onSizeChange={(size) => changeQuery({ size, page: 0 })}
            />
          )}
        </>
      )}

      <TaskFormModal
        open={creating || editing !== null}
        task={editing}
        defaultStatus={createStatus}
        users={users.data ?? []}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(body) => (editing ? update.mutateAsync({ taskId: editing.id, body }) : create.mutateAsync(body))}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete task?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          "<span className="font-semibold text-ink-900">{deleting?.title}</span>" will be permanently deleted.
        </p>
      </Modal>
    </div>
  );
}
