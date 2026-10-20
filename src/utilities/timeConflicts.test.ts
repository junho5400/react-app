import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { coursesConflict, isUnavailable } from './timeConflicts';
import type { Course } from '../services/courseSchedule';

const makeCourse = (term: string, meets: string): Course => ({
  term,
  number: '101',
  meets,
  title: 'Test Course',
});

describe('coursesConflict', () => {
  it('detects overlapping days and times in the same term', () => {
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Fall', 'MWF 9:00-9:50')),
    ).toBe(true);
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Fall', 'W 9:30-10:20')),
    ).toBe(true);
  });

  it('ignores courses in different terms', () => {
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Spring', 'MWF 9:00-9:50')),
    ).toBe(false);
  });

  it('ignores courses with no shared meeting day', () => {
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Fall', 'TuTh 9:00-9:50')),
    ).toBe(false);
  });

  it('ignores shared days with non-overlapping times', () => {
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Fall', 'MWF 10:00-10:50')),
    ).toBe(false);
  });

  it('ignores adjacent meetings that only touch at the endpoint', () => {
    expect(
      coursesConflict(makeCourse('Fall', 'MWF 9:00-9:50'), makeCourse('Fall', 'MWF 9:50-10:40')),
    ).toBe(false);
  });

  it('parses multi-letter days such as TuTh', () => {
    expect(
      coursesConflict(
        makeCourse('Fall', 'TuTh 14:00-15:20'),
        makeCourse('Fall', 'Th 14:30-15:00'),
      ),
    ).toBe(true);
    expect(
      coursesConflict(
        makeCourse('Fall', 'TuTh 14:00-15:20'),
        makeCourse('Fall', 'MWF 14:00-15:20'),
      ),
    ).toBe(false);
  });

  it('never conflicts when either meeting time is empty', () => {
    expect(coursesConflict(makeCourse('Fall', ''), makeCourse('Fall', 'MWF 9:00-9:50'))).toBe(
      false,
    );
    expect(coursesConflict(makeCourse('Fall', ''), makeCourse('Fall', ''))).toBe(false);
  });
});

describe('isUnavailable', () => {
  it('reports true when any selected course conflicts', () => {
    const course = makeCourse('Fall', 'M 9:00-9:50');
    const selected = [makeCourse('Fall', 'MWF 9:30-10:20'), makeCourse('Fall', 'TuTh 9:30-10:20')];
    expect(isUnavailable(course, selected)).toBe(true);
  });

  it('reports false when nothing selected conflicts', () => {
    const course = makeCourse('Fall', 'M 9:00-9:50');
    const selected = [makeCourse('Fall', 'TuTh 9:30-10:20'), makeCourse('Spring', 'M 9:00-9:50')];
    expect(isUnavailable(course, selected)).toBe(false);
  });
});
