import { useState, type FormEvent } from 'react';
import { errorMessage, fieldErrorsOf } from '../../api/axiosClient';
import type { RegisterRequest } from '../../types/api';
import { hasErrors, validateRegister, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/States';

interface RegisterFormProps {
  onSubmit: (values: RegisterRequest) => Promise<void>;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterRequest>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterRequest>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof RegisterRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateRegister(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      await onSubmit({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <Input label="Name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
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
        autoComplete="new-password"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        hint="At least 8 characters, with a letter and a number."
      />
      <Button type="submit" loading={submitting} className="w-full">
        Create account
      </Button>
    </form>
  );
}
