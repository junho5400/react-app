import { act, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { Mock } from 'vitest';

export type DatabaseSnapshot = { val: () => unknown };
export type ValueCallback = (snapshot: DatabaseSnapshot) => void;
export type CancelCallback = (error: Error) => void;

export const lastValueCallback = (mockOnValue: Mock): ValueCallback => {
  const call = mockOnValue.mock.calls.at(-1);
  if (call === undefined) {
    throw new Error('Expected onValue to have been called.');
  }
  return call[1] as ValueCallback;
};

const lastCancelCallback = (mockOnValue: Mock): CancelCallback => {
  const callback = mockOnValue.mock.calls.at(-1)?.[2] as CancelCallback | undefined;
  if (callback === undefined) {
    throw new Error('Expected onValue to have been called with an error callback.');
  }
  return callback;
};

export const emitDatabaseValue = (mockOnValue: Mock, value: unknown): void => {
  const callback = lastValueCallback(mockOnValue);
  act(() => {
    callback({ val: () => value });
  });
};

export const emitDatabaseError = (mockOnValue: Mock, error: Error): void => {
  const callback = lastCancelCallback(mockOnValue);
  act(() => {
    callback(error);
  });
};

export const lastUnsubscribe = (mockOnValue: Mock): Mock => {
  const unsubscribe = mockOnValue.mock.results.at(-1)?.value as Mock | undefined;
  if (typeof unsubscribe !== 'function') {
    throw new Error('Expected onValue to return an unsubscribe function.');
  }
  return unsubscribe;
};

export const stubDatabaseSubscription = (mockOnValue: Mock): void => {
  mockOnValue.mockImplementation(() => vi.fn());
};

export const waitForSubscription = async (mockOnValue: Mock): Promise<void> => {
  await waitFor(() => {
    expect(mockOnValue).toHaveBeenCalled();
  });
};
