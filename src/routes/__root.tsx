import { createRootRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { parseCourseSchedule } from '../services/courseSchedule';
import { ScheduleContextProvider, SelectedCoursesProvider } from '../services/scheduleContext';
import { useDbData } from '../utilities/firebase';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [rawSchedule, loading, databaseError] = useDbData('/schedule');

  let title = 'CS Course Schedule';
  let content: ReactNode;

  if (loading) {
    content = <p role="status">Loading course schedule...</p>;
  } else if (databaseError !== undefined) {
    content = <p role="alert">{databaseError.message}</p>;
  } else if (rawSchedule === undefined) {
    content = <p role="alert">No course schedule data is available.</p>;
  } else {
    try {
      const schedule = parseCourseSchedule(rawSchedule);
      title = schedule.title;
      content = (
        <ScheduleContextProvider value={schedule}>
          <SelectedCoursesProvider>
            <Outlet />
          </SelectedCoursesProvider>
        </ScheduleContextProvider>
      );
    } catch (error) {
      content = (
        <p role="alert">
          {error instanceof Error
            ? error.message
            : 'An unexpected error occurred while loading the course schedule.'}
        </p>
      );
    }
  }

  return (
    <main className="p-2 font-sans text-neutral-900">
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      {content}
    </main>
  );
}
