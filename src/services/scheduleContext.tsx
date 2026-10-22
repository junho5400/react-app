import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { CourseSchedule } from './courseSchedule';

const ScheduleContext = createContext<CourseSchedule | null>(null);

export const ScheduleContextProvider = ScheduleContext.Provider;

export const useSchedule = (): CourseSchedule => {
  const schedule = useContext(ScheduleContext);
  if (schedule === null) {
    throw new Error('useSchedule must be used within a ScheduleContextProvider.');
  }
  return schedule;
};

type SelectedCoursesState = [string[], Dispatch<SetStateAction<string[]>>];

const SelectedCoursesContext = createContext<SelectedCoursesState | null>(null);

export const SelectedCoursesProvider = ({ children }: { children: ReactNode }) => {
  const state = useState<string[]>([]);
  return (
    <SelectedCoursesContext.Provider value={state}>
      {children}
    </SelectedCoursesContext.Provider>
  );
};

export const useSelectedCourses = (): SelectedCoursesState => {
  const state = useContext(SelectedCoursesContext);
  if (state === null) {
    throw new Error('useSelectedCourses must be used within a SelectedCoursesProvider.');
  }
  return state;
};
