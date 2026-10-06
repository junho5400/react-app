const COURSE_SCHEDULE_URL =
  'https://courses.cs.northwestern.edu/394/guides/data/cs-courses.php';

export interface Course {
  term: string;
  number: string;
  meets: string;
  title: string;
}

export interface CourseSchedule {
  title: string;
  courses: Record<string, Course>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCourseSchedule = (value: unknown): CourseSchedule => {
  if (!isRecord(value) || typeof value.title !== 'string' || !isRecord(value.courses)) {
    throw new Error('The course schedule response has an invalid format.');
  }

  const courses: Record<string, Course> = {};
  for (const [id, courseValue] of Object.entries(value.courses)) {
    if (
      !isRecord(courseValue) ||
      typeof courseValue.term !== 'string' ||
      typeof courseValue.number !== 'string' ||
      typeof courseValue.meets !== 'string' ||
      typeof courseValue.title !== 'string'
    ) {
      throw new Error(`The course schedule contains invalid course data for "${id}".`);
    }

    courses[id] = {
      term: courseValue.term,
      number: courseValue.number,
      meets: courseValue.meets,
      title: courseValue.title,
    };
  }

  return { title: value.title, courses };
};

export const fetchCourseSchedule = async (signal?: AbortSignal): Promise<CourseSchedule> => {
  const response = await fetch(COURSE_SCHEDULE_URL, { signal });
  if (!response.ok) {
    throw new Error(`Could not load the course schedule (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  return parseCourseSchedule(data);
};
