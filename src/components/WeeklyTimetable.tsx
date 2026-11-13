import type { Course } from '../services/courseSchedule';
import { parseMeeting } from '../utilities/timeConflicts';
import type { Term } from './TermSelector';

export interface SelectedCourseEntry {
  id: string;
  course: Course;
}

const weekdays = [
  ['M', 'Monday'],
  ['Tu', 'Tuesday'],
  ['W', 'Wednesday'],
  ['Th', 'Thursday'],
  ['F', 'Friday'],
] as const;

// Use the same scale for the hour lines and meeting positions.
const pixelsPerMinute = 1.5;
const formatTime = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

export const WeeklyTimetable = ({ selectedCourses, term }: {
  selectedCourses: SelectedCourseEntry[];
  term: Term;
}) => {
  const termCourses = selectedCourses.filter(({ course }) => course.term === term);
  const parsed = termCourses.map((entry) => ({ ...entry, meeting: parseMeeting(entry.course.meets) }));
  const scheduled = parsed.flatMap(({ meeting, ...entry }) =>
    meeting && weekdays.some(([day]) => meeting.days.includes(day))
      ? [{ ...entry, meeting }]
      : [],
  );
  const unplaced = parsed.filter(({ meeting }) =>
    !meeting || !weekdays.some(([day]) => meeting.days.includes(day)),
  );

  if (termCourses.length === 0) {
    return <p className="text-sm text-neutral-600">No courses selected for {term}.</p>;
  }

  // Start with normal daytime hours, expanding to include early or late classes.
  const start = Math.floor(Math.min(8 * 60, ...scheduled.map(({ meeting }) => meeting.start)) / 60) * 60;
  const end = Math.ceil(Math.max(18 * 60, ...scheduled.map(({ meeting }) => meeting.end)) / 60) * 60;
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);

  return (
    <>
      {scheduled.length === 0 ? (
        <p className="text-sm text-neutral-600">Selected {term} courses have no scheduled Monday–Friday meetings.</p>
      ) : (
        <div
          role="region"
          aria-label={`${term} weekly timetable`}
          tabIndex={0}
          className="overflow-x-auto rounded-md border border-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="grid min-w-[720px] grid-cols-[64px_repeat(5,minmax(0,1fr))] pb-4 text-xs">
            <div className="border-b border-neutral-300 p-2 text-neutral-600">Time</div>
            {weekdays.map(([day, name]) => (
              <div key={day} className="border-b border-l border-neutral-300 bg-neutral-50 p-2 text-center font-semibold">{name}</div>
            ))}
            <div className="relative" style={{ height: (end - start) * pixelsPerMinute }}>
              {hours.map((hour) => (
                <span key={hour} className="absolute right-2 text-neutral-600" style={{ top: (hour - start) * pixelsPerMinute }}>
                  {formatTime(hour)}
                </span>
              ))}
            </div>
            {weekdays.map(([day, name]) => (
              <section
                key={day}
                aria-label={name}
                className="relative border-l border-neutral-300"
                style={{
                  height: (end - start) * pixelsPerMinute,
                  backgroundImage: 'linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
                  backgroundSize: `100% ${60 * pixelsPerMinute}px`,
                }}
              >
                {scheduled.filter(({ meeting }) => meeting.days.includes(day)).map(({ id, course, meeting }) => {
                  const duration = meeting.end - meeting.start;
                  const time = `${formatTime(meeting.start)}–${formatTime(meeting.end)}`;
                  const label = `CS ${course.number}: ${course.title}, ${name} ${time}`;
                  return (
                    <article
                      key={id}
                      aria-label={label}
                      title={label}
                      className="absolute inset-x-1 overflow-hidden rounded border border-blue-700 bg-blue-100 px-1 text-blue-950"
                      style={{ top: (meeting.start - start) * pixelsPerMinute, height: duration * pixelsPerMinute }}
                    >
                      <p className="font-semibold">CS {course.number}</p>
                      {duration >= 40 && <p className="truncate">{course.title}</p>}
                      {duration >= 25 && <p>{time}</p>}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      )}
      {unplaced.length > 0 && (
        <div className="mt-4 text-sm text-neutral-600">
          <h3 className="font-semibold text-neutral-900">Courses without weekday meetings</h3>
          <ul className="mt-2 space-y-1">
            {unplaced.map(({ id, course }) => (
              <li key={id}>CS {course.number}: {course.title} — {course.meets.trim() || 'No meeting time provided'}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
