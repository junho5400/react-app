import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Course, CourseSchedule } from '../services/courseSchedule';
import { isUnavailable } from '../utilities/timeConflicts';
import { TermSelector, type Term } from './TermSelector';
import { CoursePlanModal } from './CoursePlanModal';
import { useSelectedCourses } from '../services/scheduleContext';

interface CourseProps {
  id: string;
  course: Course;
  selected: boolean;
  unavailable: boolean;
  onToggle: () => void;
}

interface TermPageProps {
  schedule: CourseSchedule;
}

const CourseCard = ({ id, course, selected, unavailable, onToggle }: CourseProps) => {
  const disabled = unavailable && !selected;
  return (
    <div
      className={`flex h-full min-h-[204px] w-full flex-col rounded-md border ${
        selected
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : disabled
            ? 'border-neutral-200 bg-neutral-100 text-neutral-400 opacity-70'
            : 'border-neutral-300 bg-white text-neutral-900'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? 'Time conflict with a selected course' : undefined}
        className={`flex w-full flex-1 flex-col rounded-t-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
          selected
            ? 'cursor-pointer'
            : disabled
              ? 'cursor-not-allowed'
              : 'cursor-pointer hover:bg-neutral-100'
        }`}
      >
        <span className="flex-1 px-6 py-6">
          <span className="mb-2 block text-xl font-normal leading-6">
            {course.term} CS {course.number}
          </span>
          <span className="block text-sm leading-[21px]">{course.title}</span>
          {disabled && (
            <span className="mt-2 block text-sm font-medium leading-[21px]">
              Time conflict — unavailable
            </span>
          )}
        </span>
        <span
          className={`block border-t px-4 py-2 text-center text-sm leading-[21px] ${
            selected ? 'border-white/25' : 'border-neutral-300'
          }`}
        >
          {course.meets}
        </span>
      </button>
      <Link
        to="/edit/$courseId"
        params={{ courseId: id }}
        className={`block border-t px-4 py-2 text-center text-sm font-medium leading-[21px] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
          selected ? 'border-white/25' : 'border-neutral-300'
        }`}
      >
        Edit
      </Link>
    </div>
  );
};

export const TermPage = ({ schedule }: TermPageProps) => {
  const [selectedTerm, setSelectedTerm] = useState<Term>('Fall');
  const [selectedCourses, setSelectedCourses] = useSelectedCourses();
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const courses = Object.entries(schedule.courses).filter(
    ([, course]) => course.term === selectedTerm,
  );
  const planEntries = selectedCourses.flatMap((id) => {
    const course = schedule.courses[id];
    return course === undefined ? [] : [{ id, course }];
  });

  const selectedCourseList = selectedCourses.flatMap((id) => {
    const course = schedule.courses[id];
    return course === undefined ? [] : [course];
  });

  const toggleCourse = (id: string) => {
    const course = schedule.courses[id];
    if (course === undefined) return;
    if (selectedCourses.includes(id)) {
      setSelectedCourses((prev) => prev.filter((courseId) => courseId !== id));
      return;
    }
    if (isUnavailable(course, selectedCourseList)) return;
    setSelectedCourses((prev) => [...prev, id]);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <TermSelector selectedTerm={selectedTerm} onTermChange={setSelectedTerm} />
        <button
          type="button"
          onClick={() => setIsPlanOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
        >
          Course Plan
        </button>
      </div>
      {isPlanOpen && (
        <CoursePlanModal selectedCourses={planEntries} onClose={() => setIsPlanOpen(false)} />
      )}
      <section
        aria-label={`${selectedTerm} courses`}
        className="grid grid-cols-1 items-stretch gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4"
      >
        {courses.map(([id, course]) => {
          const selected = selectedCourses.includes(id);
          const others = selectedCourses.flatMap((selectedId) => {
            if (selectedId === id) return [];
            const selectedCourse = schedule.courses[selectedId];
            return selectedCourse === undefined ? [] : [selectedCourse];
          });
          return (
            <CourseCard
              key={id}
              id={id}
              course={course}
              selected={selected}
              unavailable={isUnavailable(course, others)}
              onToggle={() => toggleCourse(id)}
            />
          );
        })}
      </section>
    </>
  );
};
