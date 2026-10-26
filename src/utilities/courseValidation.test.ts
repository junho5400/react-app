import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { courseSchema, isValidMeets, validateCourse } from './courseValidation';

const validCourse = {
  title: 'Intro to AI',
  term: 'Fall',
  number: '213-2',
  meets: 'MWF 12:00-13:20',
};

describe('courseSchema', () => {
  it('accepts a valid course', () => {
    expect(validateCourse(validCourse).success).toBe(true);
  });

  it('accepts every term', () => {
    for (const term of ['Fall', 'Winter', 'Spring', 'Summer']) {
      expect(validateCourse({ ...validCourse, term }).success).toBe(true);
    }
  });

  it('rejects terms outside Fall, Winter, Spring, or Summer', () => {
    for (const term of ['fall', 'FALL', 'Autumn', '', 'Fall ']) {
      const result = validateCourse({ ...validCourse, term });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === 'term')).toBe(true);
      }
    }
  });

  it('requires a title of at least two characters', () => {
    expect(validateCourse({ ...validCourse, title: 'AI' }).success).toBe(true);
    for (const title of ['', 'X']) {
      const result = validateCourse({ ...validCourse, title });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === 'title')).toBe(true);
      }
    }
  });

  it('rejects whitespace-only titles but accepts padded meaningful titles', () => {
    for (const title of ['  ', '   ', ' \t ']) {
      const result = validateCourse({ ...validCourse, title });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === 'title')).toBe(true);
      }
    }
    expect(validateCourse({ ...validCourse, title: '  AI  ' }).success).toBe(true);
  });

  it('accepts plain and sectioned course numbers', () => {
    for (const number of ['101', '213', '213-2', '394-1', '0']) {
      expect(validateCourse({ ...validCourse, number }).success).toBe(true);
    }
  });

  it('rejects malformed course numbers', () => {
    for (const number of ['', 'abc', '21a', '213-', '-2', '213-2-1', ' 213', '21 3']) {
      const result = validateCourse({ ...validCourse, number });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === 'number')).toBe(true);
      }
    }
  });

  it('accepts an empty meeting time', () => {
    expect(validateCourse({ ...validCourse, meets: '' }).success).toBe(true);
  });

  it('reports the meets field for invalid meeting times', () => {
    const result = validateCourse({ ...validCourse, meets: 'not a meeting' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'meets')).toBe(true);
    }
  });

  it('exposes parsed data on success', () => {
    const result = courseSchema.safeParse(validCourse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validCourse);
    }
  });
});

describe('isValidMeets', () => {
  it.each([
    '',
    'M 9:00-9:50',
    'MWF 9:00-9:50',
    'TuTh 14:00-15:20',
    'MTuWThF 9:00-10:20',
    'SaSu 10:00-12:00',
    'F 0:00-0:01',
    'F 23:58-23:59',
    'MTuWThFSaSu 0:00-23:59',
    'W 09:05-10:05',
  ])('accepts %j', (meets) => {
    expect(isValidMeets(meets)).toBe(true);
  });

  it.each([
    '   ',
    'MWF',
    '12:00-13:20',
    'MWF12:00-13:20',
    'MWF 12:00',
    'MWF -13:20',
    'MWF 12:00-',
    'MWF 12:00-13:20-14:00',
    'MWF 13:20-12:00',
    'MWF 12:00-12:00',
    'MWF 24:00-25:00',
    'MWF 12:60-13:00',
    'MWF 9:0-10:00',
    'MWF 9-10',
    'X 12:00-13:20',
    'T 12:00-13:20',
    'S 12:00-13:20',
    'm 12:00-13:20',
    'MM 12:00-13:20',
    'TuTu 12:00-13:20',
    'MWF 9:00-9:50 extra',
  ])('rejects %j', (meets) => {
    expect(isValidMeets(meets)).toBe(false);
  });
});
