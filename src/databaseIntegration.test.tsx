import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  emitDatabaseError,
  emitDatabaseValue,
  stubDatabaseSubscription,
  waitForSubscription,
} from './test-utils/realtimeDatabase';

const { mockGetDatabase, mockOnValue, mockRef } = vi.hoisted(() => ({
  mockGetDatabase: vi.fn(() => ({})),
  mockOnValue: vi.fn(() => vi.fn()),
  mockRef: vi.fn((_database: unknown, path: string) => ({ path })),
}));

vi.mock('firebase/database', () => ({
  getDatabase: mockGetDatabase,
  onValue: mockOnValue,
  ref: mockRef,
}));

beforeEach(() => {
  mockGetDatabase.mockReset();
  mockOnValue.mockReset();
  mockRef.mockReset();
  mockGetDatabase.mockReturnValue({});
  mockRef.mockImplementation((_database: unknown, path: string) => ({ path }));
  stubDatabaseSubscription(mockOnValue);
});

const schedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'TuTh 10:00-11:20', title: 'Beta' },
  },
};

const renderWithSchedule = async (data: unknown = schedule) => {
  render(<App />);
  await waitForSubscription(mockOnValue);
  emitDatabaseValue(mockOnValue, data);
};

describe('Schedule from Realtime Database', () => {
  it('shows a loading state while waiting for data', async () => {
    render(<App />);
    await waitForSubscription(mockOnValue);

    expect(screen.getByRole('status')).toHaveTextContent('Loading course schedule...');
    expect(screen.getByRole('heading', { name: 'CS Course Schedule' })).toBeInTheDocument();
  });

  it('renders courses from the database', async () => {
    await renderWithSchedule();

    await screen.findByRole('heading', { name: 'Test Schedule' });
    expect(screen.getByRole('button', { name: /CS 101/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CS 102/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(2);
  });

  it('renders an empty course list without crashing', async () => {
    await renderWithSchedule({ title: 'Empty', courses: {} });

    await screen.findByRole('heading', { name: 'Empty' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CS / })).not.toBeInTheDocument();
  });

  it('shows database errors without crashing', async () => {
    render(<App />);
    await waitForSubscription(mockOnValue);
    emitDatabaseError(mockOnValue, new Error('Permission denied'));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Permission denied');
    expect(screen.queryByRole('button', { name: /CS / })).not.toBeInTheDocument();
  });

  it('shows a message when no data exists', async () => {
    await renderWithSchedule(null);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('No course schedule data is available.');
  });

  it('shows a message for invalid schedule data', async () => {
    await renderWithSchedule({ nope: true });

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The course schedule data has an invalid format.',
    );
  });

  it('shows a message for invalid course entries', async () => {
    await renderWithSchedule({
      title: 'Test Schedule',
      courses: { A: { term: 'Fall', number: '101' } },
    });

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The course schedule contains invalid course data for "A".',
    );
  });

  it('provides the same schedule data to the edit route', async () => {
    await renderWithSchedule();

    await screen.findByRole('button', { name: /CS 101/ });
    fireEvent.click(screen.getAllByRole('link', { name: 'Edit' })[0]);

    await screen.findByRole('heading', { name: 'Edit Fall CS 101' });
    expect(screen.getByLabelText('Title')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Meeting times')).toHaveValue('MWF 9:00-9:50');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('button', { name: /CS 101/ });
  });
});
