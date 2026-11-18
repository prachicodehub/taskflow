import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTask } from '../../test/fixtures';
import { TaskFormModal } from './TaskFormModal';

const users = [{ id: 7, name: 'Asha Rao', email: 'asha@example.com' }];

describe('TaskFormModal', () => {
  it('requires a title and rejects a past due date on create', async () => {
    const onSubmit = vi.fn();
    render(<TaskFormModal open task={null} users={users} onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Due date'), '2020-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('creates a task with the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<TaskFormModal open task={null} users={users} onClose={onClose} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Title'), '  Ship it  ');
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await userEvent.selectOptions(screen.getByLabelText('Assignee'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Ship it',
      description: null,
      priority: 'HIGH',
      status: 'TODO',
      dueDate: null,
      assigneeId: 7,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills the form when editing', () => {
    render(
      <TaskFormModal open task={makeTask({ dueDate: '2020-01-15' })} users={users} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Write the README');
    expect(screen.getByLabelText('Assignee')).toHaveValue('7');
  });
});
