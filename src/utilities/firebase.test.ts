import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDbData } from './firebase';
import {
  emitDatabaseError,
  emitDatabaseValue,
  lastUnsubscribe,
  stubDatabaseSubscription,
} from '../test-utils/realtimeDatabase';

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

describe('useDbData', () => {
  it('subscribes to the given path and reports loading initially', () => {
    const { result } = renderHook(() => useDbData('/schedule'));

    expect(mockRef).toHaveBeenCalledWith(expect.anything(), '/schedule');
    expect(mockOnValue).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([undefined, true, undefined]);
  });

  it('returns data once the snapshot arrives', () => {
    const { result } = renderHook(() => useDbData('/schedule'));

    emitDatabaseValue(mockOnValue, { title: 'Schedule' });

    expect(result.current).toEqual([{ title: 'Schedule' }, false, undefined]);
  });

  it('maps an empty snapshot to undefined data', () => {
    const { result } = renderHook(() => useDbData('/schedule'));

    emitDatabaseValue(mockOnValue, null);

    expect(result.current).toEqual([undefined, false, undefined]);
  });

  it('returns database errors', () => {
    const { result } = renderHook(() => useDbData('/schedule'));

    emitDatabaseError(mockOnValue, new Error('Permission denied'));

    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBeInstanceOf(Error);
    expect(result.current[2]?.message).toBe('Permission denied');
  });

  it('clears a previous error when a value arrives', () => {
    const { result } = renderHook(() => useDbData('/schedule'));

    emitDatabaseError(mockOnValue, new Error('Permission denied'));
    emitDatabaseValue(mockOnValue, { title: 'Schedule' });

    expect(result.current).toEqual([{ title: 'Schedule' }, false, undefined]);
  });

  it('unsubscribes when the component unmounts', () => {
    const { unmount } = renderHook(() => useDbData('/schedule'));

    const unsubscribe = lastUnsubscribe(mockOnValue);
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when the path changes', () => {
    const { rerender, result } = renderHook(({ path }) => useDbData(path), {
      initialProps: { path: '/schedule' },
    });

    emitDatabaseValue(mockOnValue, 'first');
    expect(result.current[0]).toBe('first');

    const firstUnsubscribe = lastUnsubscribe(mockOnValue);
    rerender({ path: '/other' });

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRef).toHaveBeenLastCalledWith(expect.anything(), '/other');
    expect(mockOnValue).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual([undefined, true, undefined]);

    emitDatabaseValue(mockOnValue, 'second');
    expect(result.current).toEqual(['second', false, undefined]);
  });
});
