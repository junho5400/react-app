import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
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

const openEditForm = async () => {
  const { container } = render(<App />);
  await waitForSubscription(mockOnValue);
  emitDatabaseValue(mockOnValue, schedule);
  await screen.findByRole('heading', { name: 'Test Schedule' });
  // The App router persists across tests, so only navigate when on the list page.
  if (screen.queryByRole('heading', { name: 'Edit Fall CS 101' }) === null) {
    await screen.findByRole('button', { name: /CS 101/ });
    fireEvent.click(screen.getAllByRole('link', { name: 'Edit' })[0]);
    await screen.findByRole('heading', { name: 'Edit Fall CS 101' });
  }
  const form = container.querySelector('form');
  if (form === null) throw new Error('Expected the edit form to render.');
  return form;
};

describe('Edit course validation', () => {
  it('shows inputs for all four fields prefilled with the course data', async () => {
    const form = await openEditForm();

    expect(screen.getByLabelText('Title')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Term')).toHaveValue('Fall');
    expect(screen.getByLabelText('Course number')).toHaveValue('101');
    expect(screen.getByLabelText('Meeting times')).toHaveValue('MWF 9:00-9:50');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      within(form).queryByRole('button', { name: /submit/i }),
    ).not.toBeInTheDocument();
    expect(form.querySelector('[type="submit"]')).toBeNull();
  });

  it('shows and clears a title error as the user edits', async () => {
    await openEditForm();
    const title = screen.getByLabelText('Title');

    fireEvent.change(title, { target: { value: 'X' } });
    await screen.findByText(/at least 2 characters/);
    expect(title).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(title, { target: { value: 'Algebra' } });
    await waitFor(() =>
      expect(screen.queryByText(/at least 2 characters/)).not.toBeInTheDocument(),
    );
    expect(title).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows and clears a term error as the user edits', async () => {
    await openEditForm();
    const term = screen.getByLabelText('Term');

    fireEvent.change(term, { target: { value: 'Autumn' } });
    await screen.findByText(/Fall, Winter, Spring, or Summer/);

    fireEvent.change(term, { target: { value: 'Winter' } });
    await waitFor(() =>
      expect(
        screen.queryByText(/Fall, Winter, Spring, or Summer/),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows and clears a course number error as the user edits', async () => {
    await openEditForm();
    const number = screen.getByLabelText('Course number');

    fireEvent.change(number, { target: { value: 'abc' } });
    await screen.findByText(/optional section/);

    fireEvent.change(number, { target: { value: '213-2' } });
    await waitFor(() =>
      expect(screen.queryByText(/optional section/)).not.toBeInTheDocument(),
    );
  });

  it('shows and clears meeting time errors as the user edits', async () => {
    await openEditForm();
    const meets = screen.getByLabelText('Meeting times');

    fireEvent.change(meets, { target: { value: 'MWF 13:00-12:00' } });
    await screen.findByText(/must contain days and start-end/);

    fireEvent.change(meets, { target: { value: 'TuTh 14:00-15:20' } });
    await waitFor(() =>
      expect(
        screen.queryByText(/must contain days and start-end/),
      ).not.toBeInTheDocument(),
    );

    fireEvent.change(meets, { target: { value: 'MM 9:00-9:50' } });
    await screen.findByText(/must contain days and start-end/);

    fireEvent.change(meets, { target: { value: '' } });
    await waitFor(() =>
      expect(
        screen.queryByText(/must contain days and start-end/),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps field errors independent of each other', async () => {
    await openEditForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'X' } });
    await screen.findByText(/at least 2 characters/);
    expect(screen.queryByText(/must contain days and start-end/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Meeting times')).toHaveAttribute('aria-invalid', 'false');
  });
});
