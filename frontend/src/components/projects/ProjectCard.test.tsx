import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('links to the project board and shows its details', () => {
    render(
      <MemoryRouter>
        <ProjectCard
          project={{ id: 42, name: 'Website relaunch', description: 'New marketing site', createdAt: '2026-11-01T10:00:00Z' }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /website relaunch/i });
    expect(link).toHaveAttribute('href', '/projects/42');
    expect(screen.getByText('New marketing site')).toBeInTheDocument();
  });

  it('shows a placeholder when there is no description', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={{ id: 1, name: 'Empty', description: null, createdAt: '2026-11-01T10:00:00Z' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});
