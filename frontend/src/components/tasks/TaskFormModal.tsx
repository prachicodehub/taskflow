import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage, fieldErrorsOf } from '../../api/axiosClient';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskRequest,
  type TaskStatus,
  type User,
} from '../../types/api';
import { todayIso } from '../../utils/date';
import { hasErrors, TITLE_MAX, validateTask, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/States';

interface FormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assigneeId: string;
}

const EMPTY: FormValues = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  dueDate: '',
  assigneeId: '',
};

function fromTask(task: Task): FormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ?? '',
    assigneeId: task.assignee ? String(task.assignee.id) : '',
  };
}

interface TaskFormModalProps {
  open: boolean;
  /** null → create mode */
  task: Task | null;
  /** Status preselected when creating from a column. */
  defaultStatus?: TaskStatus;
  users: User[];
  onClose: () => void;
  onSubmit: (body: TaskRequest) => Promise<unknown>;
}

export function TaskFormModal({ open, task, defaultStatus, users, onClose, onSubmit }: TaskFormModalProps) {
  const isCreate = task === null;
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const today = todayIso();

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (!open) return;
    setValues(task ? fromTask(task) : { ...EMPTY, status: defaultStatus ?? 'TODO' });
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, task, defaultStatus]);

  const set =
    <K extends keyof FormValues>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value as FormValues[K] }));
      setErrors((errs) => ({ ...errs, [field]: undefined }));
    };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateTask(values, { isCreate, today });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim() || null,
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate || null,
        assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
      });
      onClose();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'New task' : 'Edit task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={submitting}>
            {isCreate ? 'Create task' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="Title"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          hint={`${values.title.length}/${TITLE_MAX}`}
        />
        <Textarea label="Description" value={values.description} onChange={set('description')} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Priority" value={values.priority} onChange={set('priority')} error={errors.priority}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select label="Status" value={values.status} onChange={set('status')} error={errors.status}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Input
            label="Due date"
            type="date"
            min={isCreate ? today : undefined}
            value={values.dueDate}
            onChange={set('dueDate')}
            error={errors.dueDate}
          />
          <Select label="Assignee" value={values.assigneeId} onChange={set('assigneeId')} error={errors.assigneeId}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
