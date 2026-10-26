import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export const COURSE_TERMS = ['Fall', 'Winter', 'Spring', 'Summer'] as const;

export type CourseTerm = (typeof COURSE_TERMS)[number];

const TITLE_MESSAGE = 'Title must contain at least 2 characters.';
const TERM_MESSAGE = 'Term must be Fall, Winter, Spring, or Summer.';
const NUMBER_MESSAGE = 'Course number must be a number with an optional section, e.g., "213" or "213-2".';
const MEETS_MESSAGE = 'must contain days and start-end, e.g., MWF 12:00-13:20';

const COURSE_NUMBER_PATTERN = /^\d+(?:-\d+)?$/;

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

const TWO_LETTER_DAYS = new Set(['Tu', 'Th', 'Sa', 'Su']);
const ONE_LETTER_DAYS = new Set(['M', 'W', 'F']);

const parseTimeToMinutes = (text: string): number | null => {
  const match = TIME_PATTERN.exec(text);
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseDays = (text: string): string[] | null => {
  const days: string[] = [];
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (TWO_LETTER_DAYS.has(two)) {
      days.push(two);
      i += 2;
    } else {
      const one = text[i];
      if (one === undefined || !ONE_LETTER_DAYS.has(one)) return null;
      days.push(one);
      i += 1;
    }
  }
  return days;
};

export const isValidMeets = (meets: string): boolean => {
  if (meets === '') return true;
  const parts = meets.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  const [daysText, rangeText] = parts;
  if (daysText === undefined || rangeText === undefined) return false;
  const days = parseDays(daysText);
  if (days === null || days.length === 0) return false;
  if (new Set(days).size !== days.length) return false;
  const dash = rangeText.indexOf('-');
  if (dash === -1) return false;
  const startText = rangeText.slice(0, dash);
  const endText = rangeText.slice(dash + 1);
  if (startText === '' || endText === '' || endText.includes('-')) return false;
  const start = parseTimeToMinutes(startText);
  const end = parseTimeToMinutes(endText);
  if (start === null || end === null) return false;
  return start < end;
};

export const courseSchema = z.object({
  title: z.string().trim().min(2, { error: TITLE_MESSAGE }),
  term: z.enum(COURSE_TERMS, { error: TERM_MESSAGE }),
  number: z.string().regex(COURSE_NUMBER_PATTERN, { error: NUMBER_MESSAGE }),
  meets: z.string().refine(isValidMeets, { error: MEETS_MESSAGE }),
});

export type CourseFormData = z.infer<typeof courseSchema>;

export const courseResolver = zodResolver(courseSchema);

export const validateCourse = (data: unknown) => courseSchema.safeParse(data);
