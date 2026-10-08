import { useState } from 'react';
import type { Course, CourseSchedule } from '../services/courseSchedule';
import { TermSelector, type Term } from './TermSelector';

interface CourseProps {
  course: Course;
}

interface TermPageProps {
  schedule: CourseSchedule;
}

const CourseCard = ({ course }: CourseProps) => (
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

export const TermPage = ({ schedule }: TermPageProps) => {
  const [selectedTerm, setSelectedTerm] = useState<Term>('Fall');
  const courses = Object.entries(schedule.courses).filter(
    ([, course]) => course.term === selectedTerm,
  );

  return (
    <>
      <TermSelector selectedTerm={selectedTerm} onTermChange={setSelectedTerm} />
      <section
        aria-label={`${selectedTerm} courses`}
        className="grid grid-cols-1 items-stretch gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4"
      >
        {courses.map(([id, course]) => (
          <CourseCard key={id} course={course} />
        ))}
      </section>
    </>
  );
};
