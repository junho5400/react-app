import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { Mock } from 'vitest';

export type AuthStateCallback = (user: unknown) => void;

export const testUser = {
  uid: 'test-uid',
  displayName: 'Test User',
  email: 'test@example.com',
};

let currentUser: unknown = null;

export const setTestUser = (user: unknown): void => {
  currentUser = user;
};

// New subscribers immediately receive the current user so components that
// mount later (for example after navigation) see the same auth state.
export const stubAuthListener = (mockOnAuthStateChanged: Mock): void => {
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: AuthStateCallback) => {
    callback(currentUser);
    return vi.fn();
  });
};

export const emitAuthState = (mockOnAuthStateChanged: Mock, user: unknown): void => {
  const calls = mockOnAuthStateChanged.mock.calls;
  if (calls.length === 0) {
    throw new Error('Expected onAuthStateChanged to have been called.');
  }
  currentUser = user;
  act(() => {
    for (const call of calls) {
      (call[1] as AuthStateCallback)(user);
    }
  });
};

export const lastAuthUnsubscribe = (mockOnAuthStateChanged: Mock): Mock => {
  const unsubscribe = mockOnAuthStateChanged.mock.results.at(-1)?.value as Mock | undefined;
  if (typeof unsubscribe !== 'function') {
    throw new Error('Expected onAuthStateChanged to return an unsubscribe function.');
  }
  return unsubscribe;
};
