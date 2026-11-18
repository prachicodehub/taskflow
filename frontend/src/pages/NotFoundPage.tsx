import { Link } from 'react-router-dom';

export function NotFoundPage({ message = "The page you're looking for doesn't exist." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-bold text-ink-900">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink-900">Not found</h1>
      <p className="mt-1 text-sm text-ink-500">{message}</p>
      <Link to="/projects" className="mt-6 text-sm font-medium text-ink-900 underline decoration-signal-500 decoration-2 underline-offset-4">
        Back to projects
      </Link>
    </div>
  );
}
