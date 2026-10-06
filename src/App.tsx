import { useEffect, useState } from 'react';
import './App.css';
import { fetchCourseSchedule, type Course, type CourseSchedule } from './services/courseSchedule';

interface CourseProps {
  course: Course;
}

type ScheduleState =
  | { status: 'loading' }
  | { status: 'success'; schedule: CourseSchedule }
  | { status: 'error'; message: string };

const Course = ({ course }: CourseProps) => (
  <article className="flex h-full min-h-[204px] flex-col rounded-md border border-neutral-300 bg-white">
    <div className="flex-1 px-6 py-6">
      <h2 className="mb-2 text-xl font-normal leading-6">
        {course.term} CS {course.number}
      </h2>
      <p className="text-sm leading-[21px]">{course.title}</p>
    </div>
    <p className="border-t border-neutral-300 px-4 py-2 text-center text-sm leading-[21px]">
      {course.meets}
    </p>
  </article>
);

const App = () => {
  const [state, setState] = useState<ScheduleState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    const loadSchedule = async () => {
      try {
        const schedule = await fetchCourseSchedule(controller.signal);
        setState({ status: 'success', schedule });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred while loading the course schedule.',
          });
        }
      }
    };

    void loadSchedule();

    return () => controller.abort();
  }, []);

  const title = state.status === 'success' ? state.schedule.title : 'CS Course Schedule';

  return (
    <main className="p-2 font-sans text-neutral-900">
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      {state.status === 'loading' && <p role="status">Loading course schedule...</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'success' && (
        <section
          aria-label={state.schedule.title}
          className="grid grid-cols-1 items-stretch gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4"
        >
          {Object.entries(state.schedule.courses).map(([id, course]) => (
            <Course key={id} course={course} />
          ))}
        </section>
      )}
    </main>
  );
};

export default App;
