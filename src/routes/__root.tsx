import { useEffect, useState } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { fetchCourseSchedule, type CourseSchedule } from '../services/courseSchedule';
import { ScheduleContextProvider, SelectedCoursesProvider } from '../services/scheduleContext';

export const Route = createRootRoute({
  component: RootComponent,
});

type ScheduleState =
  | { status: 'loading' }
  | { status: 'success'; schedule: CourseSchedule }
  | { status: 'error'; message: string };

function RootComponent() {
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
        <ScheduleContextProvider value={state.schedule}>
          <SelectedCoursesProvider>
            <Outlet />
          </SelectedCoursesProvider>
        </ScheduleContextProvider>
      )}
    </main>
  );
}
