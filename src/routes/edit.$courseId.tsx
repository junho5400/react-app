import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useSchedule } from '../services/scheduleContext';

export const Route = createFileRoute('/edit/$courseId')({
  component: EditCourseComponent,
});

function EditCourseComponent() {
  const { courseId } = Route.useParams();
  const schedule = useSchedule();
  const navigate = useNavigate();
  const course = schedule.courses[courseId];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleCancel = () => {
    void navigate({ to: '/' });
  };

  if (course === undefined) {
    return (
      <section aria-label="Edit course">
        <p role="alert">Course &ldquo;{courseId}&rdquo; was not found.</p>
        <button
          type="button"
          onClick={handleCancel}
          className="mt-4 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Edit course" className="max-w-md">
      <h2 className="mb-4 text-xl font-semibold">
        Edit {course.term} CS {course.number}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            type="text"
            name="title"
            defaultValue={course.title}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Meeting times
          <input
            type="text"
            name="meets"
            defaultValue={course.meets}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900"
          />
        </label>
        <div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
