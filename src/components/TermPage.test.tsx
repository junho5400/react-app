import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { TermPage } from './TermPage';
import type { CourseSchedule } from '../services/courseSchedule';
import { SelectedCoursesProvider } from '../services/scheduleContext';

const schedule: CourseSchedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'W 9:30-10:20', title: 'Beta' },
    C: { term: 'Fall', number: '103', meets: 'TuTh 9:00-9:50', title: 'Gamma' },
    D: { term: 'Spring', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha Spring' },
  },
};

const card = (number: string) => screen.getByRole('button', { name: new RegExp(`CS ${number}`) });

const renderWithRouter = async () => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SelectedCoursesProvider>
        <TermPage schedule={schedule} />
      </SelectedCoursesProvider>
    ),
  });
  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/edit/$courseId',
    component: () => <div>Edit course</div>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, editRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole('button', { name: /CS 101/ });
  return router;
};

describe('TermPage time conflicts', () => {
  it('disables conflicting courses but keeps selected ones selectable', async () => {
    await renderWithRouter();

    fireEvent.click(card('101'));
    expect(card('101')).toHaveAttribute('aria-pressed', 'true');

    expect(card('102')).toBeDisabled();
    expect(card('103')).toBeEnabled();

    // Disabled cards cannot be selected.
    fireEvent.click(card('102'));
    expect(card('102')).toHaveAttribute('aria-pressed', 'false');

    // Unselecting clears the conflict immediately.
    fireEvent.click(card('101'));
    expect(card('101')).toHaveAttribute('aria-pressed', 'false');
    expect(card('102')).toBeEnabled();
  });

  it('does not conflict across terms', async () => {
    await renderWithRouter();

    fireEvent.click(card('101'));
    fireEvent.click(screen.getByRole('button', { name: 'Spring' }));
    expect(card('101')).toBeEnabled();
  });

  it('renders an edit link for each course card', async () => {
    const router = await renderWithRouter();

    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(3);

    fireEvent.click(editLinks[0]);
    await screen.findByText('Edit course');
    expect(router.state.location.pathname).toBe('/edit/A');
  });
});
