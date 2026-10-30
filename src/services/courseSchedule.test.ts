import { describe, expect, it } from 'vitest';
import { parseCourseSchedule } from './courseSchedule';

const validSchedule = {
  title: 'CS Courses for 2018-2019',
  courses: {
    F101: {
      term: 'Fall',
      number: '101',
      meets: 'MWF 11:00-11:50',
      title: 'Computer Science: Concepts, Philosophy, and Connections',
    },
    W213: {
      term: 'Winter',
      number: '213',
      meets: 'TuTh 15:40-16:55',
      title: 'Intro to Computer Systems',
    },
  },
};

describe('parseCourseSchedule', () => {
  it('returns the schedule while preserving course IDs', () => {
    expect(parseCourseSchedule(validSchedule)).toEqual(validSchedule);
  });

  it('accepts a schedule with no courses', () => {
    expect(parseCourseSchedule({ title: 'Empty', courses: {} })).toEqual({
      title: 'Empty',
      courses: {},
    });
  });

  it.each([null, undefined, 'schedule', 42, []])(
    'rejects non-object data: %p',
    (value: unknown) => {
      expect(() => parseCourseSchedule(value)).toThrow(
        'The course schedule data has an invalid format.',
      );
    },
  );

  it('rejects data without a title or courses record', () => {
    expect(() => parseCourseSchedule({ courses: {} })).toThrow(
      'The course schedule data has an invalid format.',
    );
    expect(() => parseCourseSchedule({ title: 'T', courses: [] })).toThrow(
      'The course schedule data has an invalid format.',
    );
  });

  it('rejects invalid course entries', () => {
    const invalid = {
      title: 'T',
      courses: { F101: { term: 'Fall', number: '101' } },
    };
    expect(() => parseCourseSchedule(invalid)).toThrow(
      'The course schedule contains invalid course data for "F101".',
    );
  });
});
