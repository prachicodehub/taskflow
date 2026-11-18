import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start organising your team's work."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink-900 underline decoration-signal-500 decoration-2 underline-offset-4 hover:decoration-ink-900">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm
        onSubmit={async (values) => {
          await register(values);
          navigate('/projects', { replace: true });
        }}
      />
    </AuthLayout>
  );
}
