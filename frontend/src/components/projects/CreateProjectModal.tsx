import { useState, type FormEvent } from 'react';
import { errorMessage, fieldErrorsOf } from '../../api/axiosClient';
import { useCreateProject } from '../../hooks/queries';
import type { Project } from '../../types/api';
import { hasErrors, validateProject, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/States';

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (project: Project) => void;
}) {
  const createProject = useCreateProject();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'name' | 'description'>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setDescription('');
    setErrors({});
    setFormError(null);
    onClose();
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateProject({ name, description });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });
      onCreated?.(project);
      close();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New project"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" loading={createProject.isPending}>
            Create project
          </Button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={100} />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          maxLength={1000}
        />
      </form>
    </Modal>
  );
}
