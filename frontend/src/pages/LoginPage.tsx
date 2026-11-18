import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { login, logoutReason } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/projects';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your projects."
      footer={
        <>
          New to TaskFlow?{' '}
          <Link to="/register" className="font-semibold text-ink-900 underline decoration-signal-500 decoration-2 underline-offset-4 hover:decoration-ink-900">
            Create an account
          </Link>
        </>
      }
    >
      {logoutReason && (
        <p className="mb-4 rounded-[10px] border-l-4 border-signal-500 bg-signal-50 px-3.5 py-2.5 text-sm font-medium text-ink-800">
          {logoutReason}
        </p>
      )}
      <LoginForm
        onSubmit={async (values) => {
          await login(values);
          navigate(from, { replace: true });
        }}
      />
    </AuthLayout>
  );
}
