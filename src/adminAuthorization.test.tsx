import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { routeTree } from './routeTree.gen';
import { useAdmin } from './hooks/useAdmin';
import {
  emitDatabaseValue,
  stubDatabaseSubscription,
  waitForSubscription,
} from './test-utils/realtimeDatabase';
import {
  emitAuthState,
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


const roleCalls = () => (mockOnValue as Mock).mock.calls.filter((call) => call[0].path.startsWith('/admins/'));
const roleValue = (value: unknown) => act(() => {
  for (const call of roleCalls()) call[1]({ val: () => value });
});
const roleError = () => act(() => {
  for (const call of roleCalls()) call[2](new Error('Permission denied'));
});

describe('administrator membership hook', () => {
  it('does not query roles for guests or while authentication loads', () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    const { result } = renderHook(() => useAdmin());
    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(mockOnValue).not.toHaveBeenCalled();
    emitAuthState(mockOnAuthStateChanged, null);
    expect(result.current.loading).toBe(false);
    expect(mockOnValue).not.toHaveBeenCalled();
  });

  it.each([null, undefined, false, 'true', 1, { admin: true }])('denies non-true membership %j', (value) => {
    setTestUser(testUser);
    const { result } = renderHook(() => useAdmin());
    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), '/admins/test-uid');
    roleValue(value);
    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('fails closed on errors, including after a successful role lookup', () => {
    setTestUser(testUser);
    const { result } = renderHook(() => useAdmin());
    roleValue(true);
    expect(result.current.isAdmin).toBe(true);
    roleError();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe('Permission denied');
  });

  it('cleans up, ignores late callbacks, and never reuses roles across sign-out or accounts', () => {
    setTestUser(testUser);
    const { result, unmount } = renderHook(() => useAdmin());
    const oldCall = roleCalls()[0];
    const oldUnsubscribe = mockOnValue.mock.results[0].value;
    roleValue(true);
    emitAuthState(mockOnAuthStateChanged, { ...testUser, uid: 'other-uid' });
    expect(oldUnsubscribe).toHaveBeenCalledOnce();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(true);
    act(() => oldCall[1]({ val: () => true }));
    expect(result.current.isAdmin).toBe(false);
    roleValue(true);
    expect(result.current.isAdmin).toBe(true);
    emitAuthState(mockOnAuthStateChanged, null);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
    const count = roleCalls().length;
    emitAuthState(mockOnAuthStateChanged, testUser);
    expect(roleCalls()).toHaveLength(count + 1);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(true);
    const unsubscribe = mockOnValue.mock.results.at(-1)!.value;
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('administrator edit authorization', () => {
  it.each([null, false, 'true', 'guest'])('keeps scheduling available without administrator membership %j', async (value) => {
    setTestUser(value === 'guest' ? null : testUser);
    await renderAt('/');
    await screen.findByRole('button', { name: /CS 101/ });
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    roleValue(value);
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    const card = screen.getByRole('button', { name: /CS 101/ });
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Course Plan' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows links only after true membership and removes them on failure or sign-out', async () => {
    setTestUser(testUser);
    await renderAt('/');
    await screen.findByRole('button', { name: /CS 101/ });
    roleValue(true);
    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(2);
    roleError();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    roleValue(true);
    emitAuthState(mockOnAuthStateChanged, null);
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('blocks direct URLs during authentication and role loading, failure, and non-admin access', async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    await renderAt('/edit/A');
    await screen.findByText('Checking edit permissions...');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    emitAuthState(mockOnAuthStateChanged, testUser);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    roleError();
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to verify');
    roleValue(null);
    expect(screen.getByRole('alert')).toHaveTextContent('Only administrators');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it.each(['sign-out', 'account change', 'revocation', 'lookup error'])('blocks a pending submission after %s', async (change) => {
    setTestUser(testUser);
    await renderAt('/edit/A');
    await screen.findByText('Checking edit permissions...');
    roleValue(true);
    const title = await screen.findByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Changed course' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    const form = title.closest('form')!;
    // Validation resolves asynchronously: permission must be checked again in onSubmit.
    fireEvent.submit(form);
    if (change === 'sign-out') emitAuthState(mockOnAuthStateChanged, null);
    if (change === 'account change') emitAuthState(mockOnAuthStateChanged, { ...testUser, uid: 'other' });
    if (change === 'revocation') roleValue(false);
    if (change === 'lookup error') roleError();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
