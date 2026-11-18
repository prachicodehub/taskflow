import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/axiosClient';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { NewProjectTile, ProjectCard } from '../components/projects/ProjectCard';
import { Button, PlusIcon } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../hooks/queries';

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const projects = useProjects();
  const [creating, setCreating] = useState(false);
  const firstName = user?.name.split(' ')[0];
  const count = projects.data?.length ?? 0;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-500">Hi {firstName}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink-900 sm:text-4xl">Your projects</h1>
          {projects.isSuccess && count > 0 && (
            <p className="mt-2 text-sm text-ink-500">
              {count} {count === 1 ? 'board' : 'boards'}. Pick one to see its tasks.
            </p>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon />
          New project
        </Button>
      </div>

      {projects.isPending ? (
        <PageSpinner label="Loading projects…" />
      ) : projects.isError ? (
        <ErrorState message={errorMessage(projects.error)} onRetry={() => projects.refetch()} />
      ) : count === 0 ? (
        <EmptyState
          title="No projects yet"
          message="A project is a board for one piece of work. Create one, then add its tasks."
          action={
            <Button variant="accent" onClick={() => setCreating(true)}>
              <PlusIcon />
              Create your first project
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
          <li>
            <NewProjectTile onClick={() => setCreating(true)} />
          </li>
        </ul>
      )}

      <CreateProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(project) => navigate(`/projects/${project.id}`)}
      />
    </div>
  );
}
