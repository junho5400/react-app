import type { Course } from '../services/courseSchedule';

interface SelectedCourseEntry {
  id: string;
  course: Course;
}

interface CoursePlanModalProps {
  selectedCourses: SelectedCourseEntry[];
  onClose: () => void;
}

export const CoursePlanModal = ({ selectedCourses, onClose }: CoursePlanModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onClick={onClose}
    data-testid="course-plan-overlay"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Course plan"
      onClick={(event) => event.stopPropagation()}
      className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-6 shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Course Plan</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
        >
          Close
        </button>
      </div>
      {selectedCourses.length === 0 ? (
        <div className="text-sm leading-6 text-neutral-900">
          <p className="mb-2">No courses have been selected yet.</p>
          <p>
            To select courses, click on a course card. Click a selected course again to remove
            it from your plan.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {selectedCourses.map(({ id, course }) => (
            <li key={id} className="py-3">
              <p className="text-sm font-medium">
                {course.term} CS {course.number}: {course.title}
              </p>
              <p className="text-sm text-neutral-600">{course.meets}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
