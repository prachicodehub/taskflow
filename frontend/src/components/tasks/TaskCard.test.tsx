import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTask } from '../../test/fixtures';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('renders title, priority, assignee and due date', () => {
    render(<TaskCard task={makeTask({ dueDate: '2099-12-31' })} />);

    expect(screen.getByRole('heading', { name: 'Write the README' })).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Assigned to Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
    expect(screen.getByTestId('task-card-1')).toHaveAttribute('data-overdue', 'false');
  });

  it('highlights an overdue task', () => {
    render(<TaskCard task={makeTask({ dueDate: '2020-01-15', overdue: true })} />);

    const card = screen.getByTestId('task-card-1');
    expect(card).toHaveAttribute('data-overdue', 'true');
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it('treats a past due date as overdue even if the server flag is stale', () => {
    render(<TaskCard task={makeTask({ dueDate: '2020-01-15', overdue: false })} />);
    expect(screen.getByTestId('task-card-1')).toHaveAttribute('data-overdue', 'true');
  });

  it('does not mark a done task as overdue', () => {
    render(<TaskCard task={makeTask({ dueDate: '2020-01-15', status: 'DONE' })} />);
    expect(screen.getByTestId('task-card-1')).toHaveAttribute('data-overdue', 'false');
  });

  it('shows "Unassigned" and "No due date" when those are empty', () => {
    render(<TaskCard task={makeTask({ assignee: null, dueDate: null })} />);
    expect(screen.getByRole('img', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('calls the handlers for status change, edit and delete', async () => {
    const task = makeTask();
    const onStatusChange = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<TaskCard task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.selectOptions(screen.getByLabelText('Status of Write the README'), 'IN_PROGRESS');
    expect(onStatusChange).toHaveBeenCalledWith(task, 'IN_PROGRESS');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(task);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
