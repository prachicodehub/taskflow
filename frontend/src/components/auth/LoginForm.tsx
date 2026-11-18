import { useState, type FormEvent } from 'react';
import { errorMessage, fieldErrorsOf } from '../../api/axiosClient';
import type { LoginRequest } from '../../types/api';
import { hasErrors, validateLogin, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/States';

interface LoginFormProps {
  onSubmit: (values: LoginRequest) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [values, setValues] = useState<LoginRequest>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof LoginRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateLogin(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      await onSubmit({ email: values.email.trim(), password: values.password });
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={set('email')}
        error={errors.email}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
      />
      <Button type="submit" loading={submitting} className="w-full">
        Log in
      </Button>
    </form>
  );
}
