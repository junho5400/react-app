import type { Course } from '../services/courseSchedule';

export interface Meeting {
  days: string[];
  start: number;
  end: number;
}

const parseDays = (text: string): string[] | null => {
  const days: string[] = [];
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === 'Tu' || two === 'Th' || two === 'Sa' || two === 'Su') {
      days.push(two);
      i += 2;
    } else {
      if (!['M', 'W', 'F'].includes(text[i])) return null;
      days.push(text[i]);
      i += 1;
    }
  }
  return [...new Set(days)];
};

const parseTime = (text: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const parseMeeting = (meets: string): Meeting | null => {
  const match = /^(\S+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(meets.trim());
  if (!match) return null;
  const days = parseDays(match[1]);
  const start = parseTime(match[2]);
  const end = parseTime(match[3]);
  if (start === null || end === null || !days?.length || start >= end) return null;
  return { days, start, end };
};

const daysOverlap = (a: string[], b: string[]): boolean => a.some((day) => b.includes(day));

const timesOverlap = (a: Meeting, b: Meeting): boolean =>
  Math.max(a.start, b.start) < Math.min(a.end, b.end);

export const coursesConflict = (a: Course, b: Course): boolean => {
  if (a.term !== b.term) return false;
  const meetingA = parseMeeting(a.meets);
  const meetingB = parseMeeting(b.meets);
  if (!meetingA || !meetingB) return false;
  return daysOverlap(meetingA.days, meetingB.days) && timesOverlap(meetingA, meetingB);
};

export const isUnavailable = (course: Course, selected: Course[]): boolean =>
  selected.some((other) => coursesConflict(course, other));
