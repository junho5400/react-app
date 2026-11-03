import '@testing-library/jest-dom/vitest';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from './routeTree.gen';
import { useAuth } from './hooks/useAuth';
import {
  emitDatabaseValue,
  stubDatabaseSubscription,
  waitForSubscription,
} from './test-utils/realtimeDatabase';
import {
  emitAuthState,
  lastAuthUnsubscribe,
  setTestUser,
  stubAuthListener,
  testUser,
} from './test-utils/firebaseAuth';

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
  mockGetAuth.mockReset();
  mockOnAuthStateChanged.mockReset();
  mockGoogleAuthProvider.mockReset();
  mockSignInWithPopup.mockReset();
  mockSignOut.mockReset();
  mockGetDatabase.mockReturnValue({});
  mockGetAuth.mockReturnValue({});
  mockRef.mockImplementation((_database: unknown, path: string) => ({ path }));
  mockUpdate.mockImplementation(() => Promise.resolve());
  mockSignInWithPopup.mockImplementation(() => Promise.resolve({}));
  mockSignOut.mockImplementation(() => Promise.resolve());
  stubDatabaseSubscription(mockOnValue);
  setTestUser(null);
  stubAuthListener(mockOnAuthStateChanged);
});

const schedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'TuTh 10:00-11:20', title: 'Beta' },
  },
};

// A fresh router per test keeps navigation isolated between tests.
const renderAt = async (path: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  await waitForSubscription(mockOnValue);
  emitDatabaseValue(mockOnValue, schedule);
  return router;
};

describe('useAuth hook', () => {
  it('reports loading initially, then the signed-in user', () => {
    // Hold back the first auth callback to observe the loading state.
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({ user: null, isAuthenticated: false, loading: true });

    emitAuthState(mockOnAuthStateChanged, testUser);
    expect(result.current).toEqual({ user: testUser, isAuthenticated: true, loading: false });

    emitAuthState(mockOnAuthStateChanged, null);
    expect(result.current).toEqual({ user: null, isAuthenticated: false, loading: false });
  });

  it('unsubscribes from the auth listener on unmount', () => {
    const { unmount } = renderHook(() => useAuth());

    const unsubscribe = lastAuthUnsubscribe(mockOnAuthStateChanged);
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('Authentication banner', () => {
  it('shows a welcome message and Sign In button for guests', async () => {
    await renderAt('/');

    await screen.findByRole('button', { name: /CS 101/ });
    expect(screen.getByText(/welcome to the course scheduler/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
  });

  it('shows the user name and Sign Out button when signed in', async () => {
    setTestUser(testUser);
    await renderAt('/');

    await screen.findByRole('button', { name: /CS 101/ });
    expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it('updates when authentication state changes', async () => {
    await renderAt('/');

    await screen.findByRole('button', { name: 'Sign In' });
    emitAuthState(mockOnAuthStateChanged, testUser);

    await screen.findByRole('button', { name: 'Sign Out' });
    expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();

    emitAuthState(mockOnAuthStateChanged, null);
    await screen.findByRole('button', { name: 'Sign In' });
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
  });

  it('signs in with Google when Sign In is clicked', async () => {
    await renderAt('/');
    await screen.findByRole('button', { name: 'Sign In' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockSignInWithPopup).toHaveBeenCalledTimes(1));
    expect(mockGoogleAuthProvider).toHaveBeenCalledTimes(1);
    expect(mockSignInWithPopup).toHaveBeenCalledWith(
      expect.anything(),
      mockGoogleAuthProvider.mock.instances[0],
    );

    // Firebase completing sign-in flips the banner to the signed-in view.
    emitAuthState(mockOnAuthStateChanged, testUser);
    await screen.findByRole('button', { name: 'Sign Out' });
  });

  it('signs out when Sign Out is clicked', async () => {
    setTestUser(testUser);
    await renderAt('/');
    await screen.findByRole('button', { name: 'Sign Out' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));

    emitAuthState(mockOnAuthStateChanged, null);
    await screen.findByRole('button', { name: 'Sign In' });
  });

  it('shows an error when sign-in fails', async () => {
    mockSignInWithPopup.mockRejectedValueOnce(new Error('Popup blocked'));
    await renderAt('/');
    await screen.findByRole('button', { name: 'Sign In' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await screen.findByText(/sign-in failed/i);
    expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows an error when sign-out fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Network error'));
    setTestUser(testUser);
    await renderAt('/');
    await screen.findByRole('button', { name: 'Sign Out' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await screen.findByText(/sign-out failed/i);
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });
});

describe('Conditional edit access', () => {
  it('hides Edit links from guests but keeps the public course list', async () => {
    await renderAt('/');

    await screen.findByRole('button', { name: /CS 101/ });
    expect(screen.getByRole('button', { name: /CS 102/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('shows Edit links to signed-in users', async () => {
    setTestUser(testUser);
    await renderAt('/');

    await screen.findByRole('button', { name: /CS 101/ });
    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(2);
  });

  it('blocks guests from opening the edit form through its URL', async () => {
    await renderAt('/edit/A');

    await screen.findByText(/you must be signed in/i);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('button', { name: /CS 101/ });
  });

  it('opens the edit form through its URL for signed-in users', async () => {
    setTestUser(testUser);
    await renderAt('/edit/A');

    expect(await screen.findByLabelText('Title')).toHaveValue('Alpha');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('hides the edit form when the user signs out while editing', async () => {
    setTestUser(testUser);
    await renderAt('/edit/A');
    await screen.findByLabelText('Title');

    emitAuthState(mockOnAuthStateChanged, null);

    await screen.findByText(/you must be signed in/i);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });
});
