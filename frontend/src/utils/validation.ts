// Client-side checks that mirror the backend's Bean Validation rules, so users get instant feedback.
// The backend still validates everything; its field errors are shown too.

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Email must be a valid email address';
  return undefined;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister(values: {
  name: string;
  email: string;
  password: string;
}): FieldErrors<'name' | 'email' | 'password'> {
  const errors: FieldErrors<'name' | 'email' | 'password'> = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  else if (values.name.length > 100) errors.name = 'Name must not exceed 100 characters';
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (values.password.length < 8 || values.password.length > 72) {
    errors.password = 'Password must be between 8 and 72 characters';
  } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Password must contain at least one letter and one number';
  }
  return errors;
}

export const TITLE_MAX = 120;

export function validateTask(
  values: { title: string; description: string; dueDate: string },
  options: { isCreate: boolean; today: string },
): FieldErrors<'title' | 'description' | 'dueDate'> {
  const errors: FieldErrors<'title' | 'description' | 'dueDate'> = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.length > TITLE_MAX) errors.title = `Title must not exceed ${TITLE_MAX} characters`;
  if (values.description.length > 2000) errors.description = 'Description must not exceed 2000 characters';
  if (options.isCreate && values.dueDate && values.dueDate < options.today) {
    errors.dueDate = 'Due date cannot be in the past';
  }
  return errors;
}

export function validateProject(values: { name: string; description: string }): FieldErrors<'name' | 'description'> {
  const errors: FieldErrors<'name' | 'description'> = {};
  if (!values.name.trim()) errors.name = 'Project name is required';
  else if (values.name.length > 100) errors.name = 'Project name must not exceed 100 characters';
  if (values.description.length > 1000) errors.description = 'Description must not exceed 1000 characters';
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
