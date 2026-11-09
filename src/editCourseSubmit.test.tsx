import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  emitDatabaseValue,
  stubAdminSubscription,
  waitForSubscription,
} from './test-utils/realtimeDatabase';
import { setTestUser, stubAuthListener, testUser } from './test-utils/firebaseAuth';

const { mockGetDatabase, mockOnValue, mockRef, mockUpdate } = vi.hoisted(() => ({
  mockGetDatabase: vi.fn(() => ({})),
  mockOnValue: vi.fn(() => vi.fn()),
  mockRef: vi.fn((_database: unknown, path: string) => ({ path })),
  mockUpdate: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/database', () => ({
  getDatabase: mockGetDatabase,
  onValue: mockOnValue,
  ref: mockRef,
  update: mockUpdate,
}));

const {
  mockGetAuth,
  mockOnAuthStateChanged,
  mockGoogleAuthProvider,
  mockSignInWithPopup,
  mockSignOut,
} = vi.hoisted(() => ({
  mockGetAuth: vi.fn(() => ({})),
  mockOnAuthStateChanged: vi.fn(() => vi.fn()),
  mockGoogleAuthProvider: vi.fn(),
  mockSignInWithPopup: vi.fn(() => Promise.resolve({})),
  mockSignOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  onAuthStateChanged: mockOnAuthStateChanged,
  GoogleAuthProvider: mockGoogleAuthProvider,
  signInWithPopup: mockSignInWithPopup,
  signOut: mockSignOut,
}));

beforeEach(() => {
  mockGetDatabase.mockReset();
  mockOnValue.mockReset();
  mockRef.mockReset();
  mockUpdate.mockReset();
  mockGetDatabase.mockReturnValue({});
  mockRef.mockImplementation((_database: unknown, path: string) => ({ path }));
  mockUpdate.mockImplementation(() => Promise.resolve());
  stubAdminSubscription(mockOnValue);
  mockGetAuth.mockReset();
  mockOnAuthStateChanged.mockReset();
  mockGoogleAuthProvider.mockReset();
  mockSignInWithPopup.mockReset();
  mockSignOut.mockReset();
  mockGetAuth.mockReturnValue({});
  mockSignInWithPopup.mockImplementation(() => Promise.resolve({}));
  mockSignOut.mockImplementation(() => Promise.resolve());
  setTestUser(testUser);
  stubAuthListener(mockOnAuthStateChanged);
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

const submitButton = () => screen.getByRole('button', { name: 'Submit' });

// Lets async validation and submit handlers settle so "never called"
// assertions cannot pass before a broken implementation would have written.
const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

describe('Edit course submission', () => {
  it('saves changed values with update() and returns to the course list', async () => {
    await openEditForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Algebra' } });
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), '/schedule/courses/A');
    expect(mockUpdate).toHaveBeenCalledWith(
      { path: '/schedule/courses/A' },
      { title: 'Algebra', term: 'Fall', number: '101', meets: 'MWF 9:00-9:50' },
    );

    await screen.findByRole('button', { name: /CS 101/ });
    expect(
      screen.queryByRole('heading', { name: 'Edit Fall CS 101' }),
    ).not.toBeInTheDocument();

    // The onValue subscription delivers the saved data; other courses are intact.
    emitDatabaseValue(mockOnValue, {
      ...schedule,
      courses: {
        ...schedule.courses,
        A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Algebra' },
      },
    });
    await screen.findByText('Algebra');
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('never submits invalid input', async () => {
    const form = await openEditForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'X' } });
    await screen.findByText(/at least 2 characters/);
    await waitFor(() => expect(submitButton()).toBeDisabled());

    // Bypassing the disabled button still cannot submit invalid data.
    fireEvent.submit(form);
    await settle();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();
  });

  it('does not write when the values have not changed', async () => {
    const form = await openEditForm();

    await waitFor(() => expect(submitButton()).toBeDisabled());
    fireEvent.submit(form);
    await settle();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();
  });

  it('does not write when values are changed back to the original', async () => {
    const form = await openEditForm();
    const title = screen.getByLabelText('Title');

    fireEvent.change(title, { target: { value: 'Algebra' } });
    await waitFor(() => expect(submitButton()).toBeEnabled());

    fireEvent.change(title, { target: { value: 'Alpha' } });
    await waitFor(() => expect(submitButton()).toBeDisabled());

    fireEvent.submit(form);
    await settle();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();
  });

  it('shows an error and stays on the form when saving fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Permission denied'));
    await openEditForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Algebra' } });
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await screen.findByText(/failed to save/i);
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();

    // Retrying after a failure works and clears the error.
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    await screen.findByRole('button', { name: /CS 101/ });
  });

  it('prevents duplicate submissions while a save is in flight', async () => {
    let resolveUpdate!: (value: void) => void;
    const pending = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockUpdate.mockReturnValueOnce(pending);
    const form = await openEditForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Algebra' } });
    await waitFor(() => expect(submitButton()).toBeEnabled());

    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    fireEvent.submit(form);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await settle();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(submitButton()).toBeDisabled();

    resolveUpdate();
    await screen.findByRole('button', { name: /CS 101/ });
  });
});
