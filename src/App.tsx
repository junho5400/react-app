import './App.css';

interface Course {
  term: string;
  number: string;
  meets: string;
  title: string;
}

interface CourseProps {
  course: Course;
}

const schedule = {
  title: 'CS Courses for 2018-2019',
  courses: {
    F101: {
      term: 'Fall',
      number: '101',
      meets: 'MWF 11:00-11:50',
      title: 'Computer Science: Concepts, Philosophy, and Connections',
    },
    F110: {
      term: 'Fall',
      number: '110',
      meets: 'MWF 10:00-10:50',
      title: 'Intro Programming for non-majors',
    },
    S313: {
      term: 'Spring',
      number: '313',
      meets: 'TuTh 15:30-16:50',
      title: 'Tangible Interaction Design and Learning',
    },
    S314: {
      term: 'Spring',
      number: '314',
      meets: 'TuTh 9:30-10:50',
      title: 'Tech & Human Interaction',
    },
  },
};

const Course = ({ course }: CourseProps) => (
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

const App = () => (
  <main className="p-2 font-sans text-neutral-900">
    <h1 className="mb-4 text-2xl font-semibold">{schedule.title}</h1>
    <section
      aria-label={schedule.title}
      className="grid grid-cols-1 items-stretch gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4"
    >
      {Object.entries(schedule.courses).map(([id, course]) => (
        <Course key={id} course={course} />
      ))}
    </section>
  </main>
);

export default App;