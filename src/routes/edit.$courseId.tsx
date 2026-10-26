import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { FormEvent } from 'react';
import { useSchedule } from '../services/scheduleContext';
import type { Course } from '../services/courseSchedule';
import { courseResolver, type CourseFormData } from '../utilities/courseValidation';

export const Route = createFileRoute('/edit/$courseId')({
  component: EditCourseComponent,
});

interface CourseFieldProps {
  name: keyof CourseFormData;
  label: string;
  errors: FieldErrors<CourseFormData>;
  register: UseFormRegister<CourseFormData>;
}

const CourseField = ({ name, label, errors, register }: CourseFieldProps) => {
  const error = errors[name];
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        type="text"
        {...register(name)}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        className={`rounded-md border bg-white px-3 py-2 text-sm font-normal text-neutral-900 ${
          error === undefined ? 'border-neutral-300' : 'border-red-500'
        }`}
      />
      {error?.message !== undefined && (
        <span id={errorId} role="alert" className="text-sm font-normal text-red-600">
          {error.message}
        </span>
      )}
    </div>
  );
};

interface EditCourseFormProps {
  course: Course;
  onCancel: () => void;
}

const EditCourseForm = ({ course, onCancel }: EditCourseFormProps) => {
  const {
    register,
    formState: { errors },
  } = useForm<CourseFormData>({
    defaultValues: {
      title: course.title,
      term: course.term as CourseFormData['term'],
      number: course.number,
      meets: course.meets,
    },
    mode: 'onChange',
    resolver: courseResolver,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <CourseField name="title" label="Title" errors={errors} register={register} />
      <CourseField name="term" label="Term" errors={errors} register={register} />
      <CourseField name="number" label="Course number" errors={errors} register={register} />
      <CourseField name="meets" label="Meeting times" errors={errors} register={register} />
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

function EditCourseComponent() {
  const { courseId } = Route.useParams();
  const schedule = useSchedule();
  const navigate = useNavigate();
  const course = schedule.courses[courseId];

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
      <EditCourseForm key={courseId} course={course} onCancel={handleCancel} />
    </section>
  );
}
