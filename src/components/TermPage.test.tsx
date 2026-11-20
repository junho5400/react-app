import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TermPage } from './TermPage';
import type { CourseSchedule } from '../services/courseSchedule';
import { SelectedCoursesProvider } from '../services/scheduleContext';
import { setTestUser, stubAuthListener, testUser } from '../test-utils/firebaseAuth';

vi.mock('../hooks/useAdmin', () => ({ useAdmin: () => ({ isAdmin: true }) }));

const { mockGetAuth, mockOnAuthStateChanged } = vi.hoisted(() => ({
  mockGetAuth: vi.fn(() => ({})),
  mockOnAuthStateChanged: vi.fn(() => vi.fn()),
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

beforeEach(() => {
  mockGetAuth.mockReset();
  mockOnAuthStateChanged.mockReset();
  mockGetAuth.mockReturnValue({});
  setTestUser(testUser);
  stubAuthListener(mockOnAuthStateChanged);
});

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

const renderWithRouter = async (courseSchedule: CourseSchedule = schedule) => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SelectedCoursesProvider>
        <TermPage schedule={courseSchedule} />
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

describe('TermPage search', () => {
  const search = (value: string) =>
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search courses' }), {
      target: { value },
    });
  const courseList = () => within(screen.getByRole('region', { name: / courses$/ }));

  it('updates number and title matches as the user types and clears back to all term courses', async () => {
    await renderWithRouter();

    search('10');
    expect(courseList().getAllByRole('button')).toHaveLength(3);
    search('102');
    expect(courseList().getAllByRole('button')).toHaveLength(1);
    expect(card('102')).toBeInTheDocument();
    search('  aLpH  ');
    expect(courseList().getAllByRole('button')).toHaveLength(1);
    expect(card('101')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Spring')).not.toBeInTheDocument();

    search('');
    expect(courseList().getAllByRole('button')).toHaveLength(3);
    search(' \t  ');
    expect(courseList().getAllByRole('button')).toHaveLength(3);
  });

  it('normalizes repeated whitespace in both the query and the course title', async () => {
    await renderWithRouter({
      ...schedule,
      courses: {
        ...schedule.courses,
        A: { ...schedule.courses.A, title: 'Introduction   to\tProgramming' },
      },
    });

    search('  INTRODUCTION \t to   proGRamming  ');
    expect(courseList().getAllByRole('button')).toHaveLength(1);
    expect(card('101')).toBeInTheDocument();
  });

  it('keeps the query across terms and shows a message when the selected term has no matches', async () => {
    await renderWithRouter();

    search(' alpha ');
    fireEvent.click(screen.getByRole('button', { name: 'Spring' }));
    expect(screen.getByRole('searchbox')).toHaveValue(' alpha ');
    expect(courseList().getByText('Alpha Spring')).toBeInTheDocument();
    expect(courseList().queryByText('Alpha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Winter' }));
    expect(screen.getByRole('status')).toHaveTextContent('No matching courses in Winter.');
    expect(courseList().queryByRole('button')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fall' }));
    search('unmatched');
    expect(screen.getByRole('status')).toHaveTextContent('No matching courses in Fall.');
    search('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(courseList().getAllByRole('button')).toHaveLength(3);
  });

  it('preserves hidden selections, conflicts, the course plan, and the weekly timetable', async () => {
    await renderWithRouter();
    fireEvent.click(card('101'));
    search('Beta');
    expect(card('102')).toBeDisabled();
    expect(courseList().queryByRole('button', { name: /CS 101/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Course Plan' }));
    expect(within(screen.getByRole('dialog')).getByText('Fall CS 101: Alpha')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Weekly View' }));
    expect(screen.getAllByRole('article', { name: /CS 101: Alpha,/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    search('');
    expect(card('101')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(card('101'));
    expect(card('102')).toBeEnabled();
  });

  it('keeps the correct edit link on filtered courses', async () => {
    const router = await renderWithRouter();
    search('Beta');
    fireEvent.click(screen.getByRole('link', { name: 'Edit' }));
    await screen.findByText('Edit course');
    expect(router.state.location.pathname).toBe('/edit/B');
  });
});

describe('TermPage time conflicts', () => {
  it('uses shared selections in the timetable without changing the main-page term', async () => {
    await renderWithRouter();
    fireEvent.click(card('101'));
    fireEvent.click(screen.getByRole('button', { name: 'Spring' }));
    fireEvent.click(card('101'));
    fireEvent.click(screen.getByRole('button', { name: 'Course Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weekly View' }));
    expect(screen.getAllByRole('article', { name: /CS 101: Alpha,/ })).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Timetable term'), { target: { value: 'Spring' } });
    expect(screen.getAllByRole('article', { name: /Alpha Spring/ })).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Timetable term'), { target: { value: 'Winter' } });
    expect(screen.getByText('No courses selected for Winter.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Spring' })).toHaveAttribute('aria-pressed', 'true');
    expect(card('101')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Fall' }));
    expect(card('102')).toBeDisabled();
    fireEvent.click(card('101'));
    expect(card('102')).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Course Plan' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(dialog.queryByText('Fall CS 101: Alpha')).not.toBeInTheDocument();
    expect(dialog.getByText('Spring CS 101: Alpha Spring')).toBeInTheDocument();
  });

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
