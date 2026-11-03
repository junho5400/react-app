import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { ref, update } from 'firebase/database';
import { useSchedule } from '../services/scheduleContext';
import type { Course } from '../services/courseSchedule';
import { courseResolver, type CourseFormData } from '../utilities/courseValidation';
import { database } from '../utilities/firebase';

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
  courseId: string;
  course: Course;
  onCancel: () => void;
  onSaved: () => void;
}

const isSameCourseData = (data: CourseFormData, course: Course): boolean =>
  data.title === course.title &&
  data.term === course.term &&
  data.number === course.number &&
  data.meets === course.meets;

const EditCourseForm = ({ courseId, course, onCancel, onSaved }: EditCourseFormProps) => {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlight = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
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

  const currentValues = watch();
  // Compare against the original course so a value changed and then changed
  // back counts as unchanged. Title is trimmed to match Zod's parsing.
  const hasNoChanges = isSameCourseData(
    { ...currentValues, title: currentValues.title.trim() },
    course,
  );
  const hasErrors = Object.keys(errors).length > 0;
  const submitDisabled = hasNoChanges || hasErrors || !isValid || isSubmitting || isSaving;

  const onSubmit = async (data: CourseFormData) => {
    if (saveInFlight.current) return;
    // Never write unchanged values, even when submitted programmatically.
    if (isSameCourseData(data, course)) return;
    saveInFlight.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      // update() merges these fields into the existing course only; sibling
      // courses and unrelated /schedule fields are left untouched. Saving
      // requires database rules permitting writes at
      // /schedule/courses/$courseId (for example, for signed-in users);
      // unrestricted public write access must remain disabled.
      await update(ref(database, `/schedule/courses/${courseId}`), {
        title: data.title,
        term: data.term,
        number: data.number,
        meets: data.meets,
      });
      onSaved();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setSaveError(
        `Failed to save changes: ${detail} Please check your connection and permissions, then try again.`,
      );
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <CourseField name="title" label="Title" errors={errors} register={register} />
      <CourseField name="term" label="Term" errors={errors} register={register} />
      <CourseField name="number" label="Course number" errors={errors} register={register} />
      <CourseField name="meets" label="Meeting times" errors={errors} register={register} />
      {saveError !== null && (
        <p role="alert" className="text-sm font-normal text-red-600">
          {saveError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
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

  const handleSaved = () => {
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
      <EditCourseForm
        key={courseId}
        courseId={courseId}
        course={course}
        onCancel={handleCancel}
        onSaved={handleSaved}
      />
    </section>
  );
}
