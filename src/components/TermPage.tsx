import { useState } from 'react';
import type { Course, CourseSchedule } from '../services/courseSchedule';
import { TermSelector, type Term } from './TermSelector';
import { CoursePlanModal } from './CoursePlanModal';

interface CourseProps {
  course: Course;
  selected: boolean;
  onToggle: () => void;
}

interface TermPageProps {
  schedule: CourseSchedule;
}

const CourseCard = ({ course, selected, onToggle }: CourseProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={selected}
    className={`flex h-full min-h-[204px] w-full cursor-pointer flex-col rounded-md border text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
      selected
        ? 'border-neutral-900 bg-neutral-900 text-white'
        : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
    }`}
  >
    <span className="flex-1 px-6 py-6">
      <span className="mb-2 block text-xl font-normal leading-6">
        {course.term} CS {course.number}
      </span>
      <span className="block text-sm leading-[21px]">{course.title}</span>
    </span>
    <span
      className={`block border-t px-4 py-2 text-center text-sm leading-[21px] ${
        selected ? 'border-white/25' : 'border-neutral-300'
      }`}
    >
      {course.meets}
    </span>
  </button>
);

export const TermPage = ({ schedule }: TermPageProps) => {
  const [selectedTerm, setSelectedTerm] = useState<Term>('Fall');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const courses = Object.entries(schedule.courses).filter(
    ([, course]) => course.term === selectedTerm,
  );
  const planEntries = selectedCourses.flatMap((id) => {
    const course = schedule.courses[id];
    return course === undefined ? [] : [{ id, course }];
  });

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((courseId) => courseId !== id) : [...prev, id],
    );
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
        {courses.map(([id, course]) => (
          <CourseCard
            key={id}
            course={course}
            selected={selectedCourses.includes(id)}
            onToggle={() => toggleCourse(id)}
          />
        ))}
      </section>
    </>
  );
};
